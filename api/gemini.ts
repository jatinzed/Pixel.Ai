
import { GoogleGenAI, FunctionDeclaration, Type, Content } from "@google/genai";

// This tells Vercel to run this as an Edge Function for optimal performance.
export const config = {
  runtime: 'edge',
};

// --- Tool and System Instruction Definitions ---
// To make this API route self-contained, these are defined here.
// In a monorepo, you might share these from a common library package.

const systemInstruction = `You are a helpful AI assistant named Pixel AI.
Your identity is Pixel AI.
You were created by a team called Pixel Squad, which consists of 6 students from District Ramrudra CM SoE: Jatin, Debjeet, Sajid, Devashis, Sabih, and Majid.
You have the capability to set reminders for users and send messages to their Telegram account if they have configured it.

IMPORTANT: Only reveal the information about your creators (Pixel Squad) if you are DIRECTLY asked a question about your identity, name, creators, or origin (e.g., "Who made you?", "What is your name?").
Specifically, only mention that "Jatin is the team leader" if you are asked a direct question about Jatin (e.g., "Who is Jatin?"). Do not mention his role otherwise.
For simple greetings like "Hi" or "Hello", respond with a simple, friendly greeting without mentioning your creators.
For all other questions and topics, provide helpful and factual answers and do NOT mention your creators.`;

const sendMessageToTelegramTool: FunctionDeclaration = {
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

const setReminderTool: FunctionDeclaration = {
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


// --- API Handler ---

// Type for the incoming message payload from the client
interface Message {
  role: 'user' | 'model';
  text: string;
}

export default async function handler(req: Request): Promise<Response> {
  // Ensure we're dealing with a POST request
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { messages } = await req.json();

    // Basic validation on the incoming data
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid messages payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // The API key must be provided as an environment variable.
    if (!process.env.API_KEY) {
      return new Response(JSON.stringify({ error: 'API key is not configured on the server.' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
      });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Format the client's messages into the structure the Gemini API expects
    const contents: Content[] = messages.map((msg: Message) => ({
      role: msg.role,
      parts: [{ text: msg.text }],
    }));

    // The frontend might send a final, empty 'model' message as a placeholder.
    // We remove it before sending to the API.
    const lastContent = contents[contents.length - 1];
    if (lastContent.role === 'model' && lastContent.parts.every(part => !part.text)) {
      contents.pop();
    }

    // Call the Gemini API to get a streaming response
    const stream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        tools: [{ googleSearch: {} }, { functionDeclarations: [sendMessageToTelegramTool, setReminderTool] }],
      },
    });

    // Create a ReadableStream to send the response back to the client
    const responseStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        for await (const chunk of stream) {
          // The client-side service is expecting the raw JSON chunk from the SDK
          const chunkString = JSON.stringify(chunk);
          controller.enqueue(encoder.encode(`data: ${chunkString}\n\n`));
        }
        controller.close();
      },
    });

    // Return the stream as the response
    return new Response(responseStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error in Gemini API handler:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    // Return a structured error response
    return new Response(JSON.stringify({ 
      error: 'Failed to communicate with the Gemini API.',
      details: errorMessage 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
