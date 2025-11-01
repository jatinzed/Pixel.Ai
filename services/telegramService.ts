// The Telegram Bot Token is loaded from an environment variable for security.
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

interface TelegramResponse {
    ok: boolean;
    description?: string;
}

/**
 * Sends a message to a specific user via Telegram bot.
 * @param userId The chat_id of the Telegram user.
 * @param message The text message to send.
 * @returns An object indicating success or failure.
 */
export async function sendMessageToTelegram(
    userId: string,
    message: string
): Promise<{ ok: boolean; message: string }> {
    if (!BOT_TOKEN) {
        const errorMessage = "Telegram integration is not configured. The bot token is missing.";
        console.error(errorMessage);
        return { ok: false, message: `❌ ${errorMessage}` };
    }

    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const body = {
        chat_id: userId,
        text: message,
        parse_mode: 'Markdown'
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data: TelegramResponse = await response.json();

        if (data.ok) {
            return { ok: true, message: "✅ Message sent successfully." };
        } else {
            console.error("Telegram API Error:", data.description);
            return { ok: false, message: `❌ Failed to send message: ${data.description}` };
        }
    } catch (error) {
        console.error("Failed to send message to Telegram:", error);
        return { ok: false, message: "❌ An unexpected error occurred while sending the message." };
    }
}
