import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../lib/supabase';

export class PushNotificationService {
  static async initialize(userId: string) {
    if (!Capacitor.isNativePlatform()) {
      console.log('Push notifications not available on web');
      return;
    }

    try {
      // Request permission
      const permission = await PushNotifications.requestPermissions();

      if (permission.receive === 'granted') {
        // [RESOLVIDO] google-services.json configurado.
        try {
          // Criar canal de notificação (Importante para Android 8+)
          if (Capacitor.getPlatform() === 'android') {
            await PushNotifications.createChannel({
              id: 'default',
              name: 'Notificações Geral',
              description: 'Alertas de lives e novidades',
              importance: 5, // High importance
              visibility: 1, // Public
              vibration: true,
            });
            console.log('Push channel created');
          }

          await PushNotifications.register();
          console.log('Push registration successful');
        } catch (regError) {
          console.warn('Firebase initialization error:', regError);
        }
      }

      // Add listeners
      this.addListeners(userId);
    } catch (error) {
      console.error('Error initializing push notifications:', error);
    }
  }

  private static addListeners(userId: string) {
    // On registration success, send token to server
    PushNotifications.addListener('registration', async ({ value }) => {
      console.log('Push registration success, token:', value);
      await this.saveToken(userId, value);
    });

    // On registration error
    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Push registration error:', JSON.stringify(error));
    });

    // When notification is received in foreground
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received:', notification);
    });

    // When user taps on notification
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push action performed:', notification);
    });
  }

  private static async saveToken(userId: string, token: string) {
    try {
      const platform = Capacitor.getPlatform();
      const { error } = await supabase
        .from('user_push_tokens')
        .upsert({
          user_id: userId,
          token: token,
          platform: platform,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,token'
        });

      if (error) throw error;
      console.log('Push token saved successfully');
    } catch (error) {
      console.error('Error saving push token to database:', error);
    }
  }

  static async removeToken() {
    if (!Capacitor.isNativePlatform()) return;

    try {
      // Best effort to remove the token from DB on logout
      // We don't have the specific token here easily without storing it locally,
      // so we might just want to keep it or delete all for this user?
      // For now, let's just leave it or handle it if we have the token stored.
    } catch (error) {
      console.error('Error removing push token:', error);
    }
  }
}
