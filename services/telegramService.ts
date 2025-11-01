/**
 * Sends a message via the backend /api/telegram endpoint.
 * @param userId The chat_id of the Telegram user.
 * @param message The text message to send.
 * @returns An object indicating success or failure.
 */
export async function sendMessageToTelegram(
    userId: string,
    message: string
): Promise<{ ok: boolean; message: string }> {
    try {
        const response = await fetch('/api/telegram', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId, message })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("API Error sending Telegram message:", data.message);
            return { ok: false, message: data.message || "❌ An error occurred." };
        }

        return { ok: true, message: data.message };

    } catch (error) {
        console.error("Failed to send message to Telegram via API:", error);
        return { ok: false, message: "❌ An unexpected network error occurred." };
    }
}
