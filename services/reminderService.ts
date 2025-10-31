
import { sendMessageToTelegram } from './telegramService';

/**
 * Retrieves the stored Telegram User ID for a given application user.
 * @param appUserId The unique ID of the application user.
 * @returns The Telegram User ID string, or null if not found.
 */
function getTelegramUserId(appUserId: string): string | null {
    return localStorage.getItem(`pixel-ai-telegram-id-${appUserId}`);
}

/**
 * Schedules a reminder that triggers a browser notification and a Telegram message.
 * @param appUserId The application user's ID to look up the Telegram ID.
 * @param message The reminder message content.
 * @param delayInSeconds The delay in seconds before the reminder is triggered.
 */
export async function scheduleReminder(appUserId: string, message: string, delayInSeconds: number): Promise<void> {
    // 1. Request browser notification permission if not already granted.
    if ('Notification' in window && Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.warn('Notification permission denied. Reminder will not be shown as a system notification.');
            // We can still proceed with the Telegram message.
        }
    }

    // 2. Schedule the timeout for the reminder.
    setTimeout(() => {
        // 3. Show browser notification if permission is granted.
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Pixel AI Reminder', {
                body: message,
                icon: 'https://iili.io/K4QGIa9.png' // App icon
            });
        }

        // 4. Send Telegram message if a User ID is configured.
        const telegramUserId = getTelegramUserId(appUserId);
        if (telegramUserId) {
            sendMessageToTelegram(telegramUserId, `🔔 Reminder: ${message}`);
        } else {
            console.warn('Telegram user ID not set. Cannot send reminder via Telegram.');
        }

    }, delayInSeconds * 1000);
}
