
import { GoogleGenAI, Chat, GenerateContentResponse, Content, FunctionDeclaration, Type } from "@google/genai";
import type { Message, GroundingSource } from '../types';
import { systemInstruction } from "../constants";
import { sendMessageToTelegram } from "./telegramService";
import { scheduleReminder } from "./reminderService";

// For better security, especially in production, it's recommended to use environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = 'gemini-2.5-flash';

// --- Function Declarations for Tools ---

export const sendMessageToTelegramTool: FunctionDeclaration = {
  name: 'sendMessageToTelegram',
  description: 'Sends a text message to a specified user via Telegram. Use this function ONLY when the user explicitly asks to "send a message" or "text" someone on Telegram. If a specific user ID is not mentioned in the user\'s prompt, the system will use the pre-configured Telegram user ID.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      userId: {
        type: Type.STRING,
        description: 'The chat_id of the recipient Telegram user. This is optional; if not provided, the saved user ID will be used.',
      },
      message: {
        type: Type.STRING,
        description: 'The content of the message to be sent.',
      },
    },
    required: ['message'],
  },
};

export const setReminderTool: FunctionDeclaration = {
  name: 'setReminder',
  description: 'Sets a reminder for the user. The reminder will trigger a browser notification and a Telegram message if configured. The model MUST calculate the delay in seconds from the user\'s request.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      message: {
        type: Type.STRING,
        description: 'The content of the reminder message.',
      },
      delayInSeconds: {
        type: Type.NUMBER,
        description: 'The number of seconds from now to trigger the reminder. Calculated from the user\'s request (e.g., "in 5 minutes" is 300).',
      },
    },
    required: ['message', 'delayInSeconds'],
  },
};


function buildHistory(messages: Message[]): Content[] {
    return messages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
    }));
}

function getChat(history: Message[]): Chat {
    const chat = ai.chats.create({
        model: MODEL_NAME,
        config: {
            systemInstruction: systemInstruction,
            tools: [{ googleSearch: {} }, { functionDeclarations: [sendMessageToTelegramTool, setReminderTool] }],
        },
        history: buildHistory(history)
    });
    return chat;
}


export async function* streamChat(
    messages: Message[],
    appUserId: string | null,
): AsyncGenerator<{ text: string, sources?: GroundingSource[] }> {

    if (messages.length === 0) {
        return;
    }

    const history = messages.slice(0, -1);
    const newMessage = messages[messages.length - 1].text;

    const chat = getChat(history);

    try {
        const result = await chat.sendMessageStream({ 
            message: newMessage
        });

        const seenUris = new Set<string>();

        for await (const chunk of result) {
             // First, yield the text and sources from the current chunk
            let sources: GroundingSource[] | undefined;
            const groundingMetadata = chunk.candidates?.[0]?.groundingMetadata;
            if (groundingMetadata?.groundingChunks) {
                const newSources: GroundingSource[] = [];
                for (const groundingChunk of groundingMetadata.groundingChunks) {
                    if (groundingChunk.web) {
                        const { uri, title } = groundingChunk.web;
                        if (uri && !seenUris.has(uri)) {
                            newSources.push({ uri, title: title || new URL(uri).hostname });
                            seenUris.add(uri);
                        }
                    }
                }
                if (newSources.length > 0) {
                    sources = newSources;
                }
            }
            yield { text: chunk.text ?? '', sources };

            // Then, handle function calls if they exist
            if (chunk.functionCalls) {
                for (const fc of chunk.functionCalls) {
                    if (fc.name === 'sendMessageToTelegram') {
                        const { message } = fc.args;
                        let { userId: targetUserId } = fc.args;
                        
                        if (!targetUserId && appUserId) {
                             targetUserId = localStorage.getItem(`pixel-ai-telegram-id-${appUserId}`);
                        }

                        if (targetUserId) {
                             const tgResult = await sendMessageToTelegram(targetUserId, message);
                             yield { text: `\n\n---\n${tgResult.message}` };
                        } else {
                            yield { text: `\n\n---\nI can't send the message because no Telegram User ID has been configured. You can set one in the settings menu.` };
                        }
                    } else if (fc.name === 'setReminder') {
                        if (appUserId) {
                            const { message, delayInSeconds } = fc.args;
                            if (typeof message === 'string' && typeof delayInSeconds === 'number' && delayInSeconds > 0) {
                                await scheduleReminder(appUserId, message, delayInSeconds);
                                yield { text: `\n\n---\n✅ Reminder set: "${message}"` };
                            } else {
                                yield { text: `\n\n---\nCould not set reminder due to invalid parameters.`};
                            }
                        }
                    }
                }
            }
        }

    } catch (error) {
        console.error("Gemini API error:", error);
        yield { text: "An error occurred while communicating with the AI. Please check the console for details." };
    }
}