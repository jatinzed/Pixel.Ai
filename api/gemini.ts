
// This serverless function, intended for platforms like Vercel, acts as a secure backend proxy for the Gemini API.
// It should be placed in the `/api` directory of your project.

// Define types for clarity and consistency with the frontend.
interface Message {
  role: 'user' | 'model';
  text: string;
}

interface Content {
  role: 'user' | 'model';
  parts: { text: string }[];
}

// Tool definitions are replicated on the backend to construct the request to Gemini.
const sendMessageToTelegramTool = {
  name: 'sendMessageToTelegram',
  description: 'Sends a text message to a specified user via Telegram. Use this function ONLY when the user explicitly asks to "send a message" or "text" someone on Telegram. If a specific user ID is not mentioned in the user\'s prompt, the system will use the pre-configured Telegram user ID.',
  parameters: {
    type: 'OBJECT',
    properties: {
      userId: {
        type: 'STRING',
        description: 'The chat_id of the recipient Telegram user. This is optional; if not provided, the saved user ID will be used.',
      },
      message: {
        type: 'STRING',
        description: 'The content of the message to be sent.',
      },
    },
    required: ['message'],
  },
};

const setReminderTool = {
  name: 'setReminder',
  description: 'Sets a reminder for the user. The reminder will trigger a browser notification and a Telegram message if configured. The model MUST calculate the delay in seconds from the user\'s request.',
  parameters: {
    type: 'OBJECT',
    properties: {
      message: {
        type: 'STRING',
        description: 'The content of the reminder message.',
      },
      delayInSeconds: {
        type: 'NUMBER',
        description: 'The number of seconds from now to trigger the reminder. Calculated from the user\'s request (e.g., "in 5 minutes" is 300).',
      },
    },
    required: ['message', 'delayInSeconds'],
  },
};

// System instruction is also needed on the backend.
const systemInstruction = `You are a helpful AI assistant named Pixel AI.
Your identity is Pixel AI.
You were created by a team called Pixel Squad, which consists of 6 students from District Ramrudra CM SoE: Jatin, Debjeet, Sajid, Devashis, Sabih, and Majid.
You have the capability to set reminders for users and send messages to their Telegram account if they have configured it.

IMPORTANT: Only reveal the information about your creators (Pixel Squad) if you are DIRECTLY asked a question about your identity, name, creators, or origin (e.g., "Who made you?", "What is your name?").
Specifically, only mention that "Jatin is the team leader" if you are asked a direct question about Jatin (e.g., "Who is Jatin?"). Do not mention his role otherwise.
For simple greetings like "Hi" or "Hello", respond with a simple, friendly greeting without mentioning your creators.
For all other questions and topics, provide helpful and factual answers and do NOT mention your creators.`;


// Utility to format messages for the Gemini API.
function buildHistory(messages: Message[]): Content[] {
    return messages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
    }));
}

// The main handler for the serverless function.
export default async function handler(request: Request) {
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const { messages } = await request.json();

        if (!messages || !Array.isArray(messages)) {
            return new Response('Invalid request body: "messages" array is required.', { status: 400 });
        }

        const contents = buildHistory(messages);

        const API_KEY = process.env.GEMINI_API_KEY;
        if (!API_KEY) {
            console.error("GEMINI_API_KEY is not configured.");
            return new Response('Server configuration error: API key not found.', { status: 500 });
        }
        
        // Consistent with existing frontend code and user request to fix "Gemini 2.5 Flash API".
        const MODEL_NAME = 'gemini-2.5-flash';

        // Use the streaming endpoint with SSE for easy parsing on the client.
        const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:streamGenerateContent?alt=sse&key=${API_KEY}`;

        const geminiRequestBody = {
            contents,
            systemInstruction: {
                parts: [{ text: systemInstruction }]
            },
            tools: [
                { googleSearch: {} },
                { functionDeclarations: [sendMessageToTelegramTool, setReminderTool] }
            ],
        };

        const geminiResponse = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geminiRequestBody),
        });

        if (!geminiResponse.ok) {
            const errorBody = await geminiResponse.text();
            console.error('Gemini API error:', errorBody);
            return new Response(`Error from Gemini API: ${errorBody}`, { status: geminiResponse.status });
        }
        
        // Stream the response directly from Gemini to the client.
        return new Response(geminiResponse.body, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error) {
        console.error('Internal Server Error:', error);
        return new Response('An internal server error occurred.', { status: 500 });
    }
}
