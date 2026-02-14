import { ref, set, get, remove } from 'firebase/database';
import { database } from '@/lib/firebase/config';
import { v4 as uuidv4 } from 'uuid';

export interface DeviceOverrideToken {
    businessId: string;
    newDeviceId: string;
    userEmail: string;
    createdAt: number;
    expiresAt: number;
    used: boolean;
}

/**
 * Generate a secure token for device override confirmation
 */
export function generateSecureToken(): string {
    return uuidv4();
}

/**
 * Send device override confirmation email
 * Note: This is a placeholder. You'll need to integrate with an email service like SendGrid, Resend, etc.
 */
export async function sendDeviceOverrideEmail(
    userEmail: string,
    businessId: string,
    newDeviceId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const token = generateSecureToken();
        const expiresAt = Date.now() + (30 * 60 * 1000); // 30 minutes

        // Store the token in Firebase
        const tokenData: DeviceOverrideToken = {
            businessId,
            newDeviceId,
            userEmail,
            createdAt: Date.now(),
            expiresAt,
            used: false
        };

        await set(ref(database, `device_override_tokens/${token}`), tokenData);

        // Generate confirmation URL
        const confirmationUrl = `${window.location.origin}/confirm-device-override?token=${token}`;

        // TODO: Integrate with your email service
        // For now, we'll just log the URL and show it to the user
        console.log('Device Override Confirmation URL:', confirmationUrl);

        // TEMPORARY: Copy to clipboard for testing
        if (navigator.clipboard) {
            await navigator.clipboard.writeText(confirmationUrl);
        }

        // TODO: Replace this with actual email sending
        // Example with a hypothetical email service:
        /*
        await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: userEmail,
                subject: 'Confirmation - Écraser l\'appareil',
                html: getEmailTemplate(confirmationUrl)
            })
        });
        */

        return { success: true };
    } catch (error: any) {
        console.error('Error sending device override email:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get token data from Firebase
 */
export async function getDeviceOverrideToken(token: string): Promise<DeviceOverrideToken | null> {
    try {
        const snapshot = await get(ref(database, `device_override_tokens/${token}`));
        if (snapshot.exists()) {
            return snapshot.val() as DeviceOverrideToken;
        }
        return null;
    } catch (error) {
        console.error('Error getting token:', error);
        return null;
    }
}

/**
 * Mark token as used
 */
export async function markTokenAsUsed(token: string): Promise<void> {
    await set(ref(database, `device_override_tokens/${token}/used`), true);
}

/**
 * Replace all devices with the new device
 */
export async function replaceDevice(businessId: string, newDeviceId: string): Promise<void> {
    try {
        const devicesRef = ref(database, `businesses/${businessId}/devices`);
        const snapshot = await get(devicesRef);

        if (snapshot.exists()) {
            const devices = snapshot.val();
            const deviceIds = Object.keys(devices);

            // Remove all old devices except the new one
            for (const oldDeviceId of deviceIds) {
                if (oldDeviceId !== newDeviceId) {
                    await remove(ref(database, `businesses/${businessId}/devices/${oldDeviceId}`));
                }
            }
        }

        // The new device will be added automatically on next connection attempt
    } catch (error) {
        console.error('Error replacing device:', error);
        throw error;
    }
}

/**
 * Email template for device override confirmation
 */
function getEmailTemplate(confirmationUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Confirmation - Écraser l'appareil</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; border-radius: 10px; padding: 30px; margin-bottom: 20px;">
        <h1 style="color: #dc2626; margin-top: 0;">⚠️ Confirmation requise</h1>
        <p>Vous avez demandé à écraser l'appareil actuellement connecté à votre compte TTR Gestion.</p>
        
        <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #991b1b;">Conséquences importantes :</h3>
            <ul style="margin: 10px 0; padding-left: 20px;">
                <li><strong>L'ancien appareil sera immédiatement déconnecté</strong></li>
                <li><strong>Toutes les actions offline non synchronisées seront perdues</strong></li>
                <li><strong>L'ancien appareil recevra uniquement les données de sa dernière synchronisation</strong></li>
            </ul>
        </div>
        
        <p>Si vous êtes sûr de vouloir continuer, cliquez sur le bouton ci-dessous :</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${confirmationUrl}" style="background-color: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Confirmer l'écrasement
            </a>
        </div>
        
        <p style="font-size: 14px; color: #666;">
            Ce lien expirera dans 30 minutes pour des raisons de sécurité.
        </p>
        
        <p style="font-size: 14px; color: #666;">
            Si vous n'avez pas demandé cette action, ignorez cet email et votre compte restera inchangé.
        </p>
    </div>
    
    <div style="text-align: center; font-size: 12px; color: #999;">
        <p>TTR Gestion - Système de gestion d'entreprise</p>
    </div>
</body>
</html>
    `.trim();
}
