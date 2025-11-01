
export const config = {
  runtime: 'edge',
};

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

interface TelegramResponse {
    ok: boolean;
    description?: string;
}

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
    }

    if (!BOT_TOKEN) {
        console.error("Telegram bot token is not configured on the server.");
        return new Response(JSON.stringify({ message: "❌ Telegram integration is not configured." }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    try {
        const { userId, message } = await req.json();

        if (!userId || !message) {
            return new Response(JSON.stringify({ error: 'Missing userId or message in request body' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        const body = {
            chat_id: userId,
            text: message,
            parse_mode: 'Markdown'
        };

        const tgResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data: TelegramResponse = await tgResponse.json();

        if (data.ok) {
            return new Response(JSON.stringify({ message: "✅ Message sent successfully." }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        } else {
            console.error("Telegram API Error:", data.description);
            return new Response(JSON.stringify({ message: `❌ Failed to send message: ${data.description}` }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
    } catch (error) {
        console.error("Failed to process request to /api/telegram:", error);
        return new Response(JSON.stringify({ message: "❌ An unexpected error occurred." }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
