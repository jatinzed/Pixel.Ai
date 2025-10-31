// IMPORTANT: Replace with your actual Telegram Bot Token.
// For security, it's best to load this from an environment variable.
// FIX: Widened type to `string` to allow comparison with a placeholder value, resolving a TypeScript error.
const BOT_TOKEN: string = "8202368419:AAHthdn8TVY22ing-VaSkOZSfr2M8YlrNrQ";
const TELEGRAM_API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

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
    const url = `${TELEGRAM_API_BASE}/sendMessage`;
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