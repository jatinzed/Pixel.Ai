
import { GoogleGenAI, Chat, GenerateContentResponse, Content } from "@google/genai";
import type { Message, GroundingSource } from '../types';
import { systemInstruction } from "../constants";

// For better security, especially in production, it's recommended to use environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = 'gemini-2.5-flash';

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
            tools: [{ googleSearch: {} }],
        },
        history: buildHistory(history)
    });
    return chat;
}


export async function* streamChat(
    messages: Message[],
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
        }

    } catch (error) {
        console.error("Gemini API error:", error);
        yield { text: "An error occurred while communicating with the AI. Please check the console for details." };
    }
}
