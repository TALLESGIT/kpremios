import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Capacitor } from '@capacitor/core';

export const usePushNotifications = () => {
  const { user } = useAuth();

  useEffect(() => {
    // Só executa em dispositivos nativos
    if (Capacitor.isNativePlatform() && user) {
      registerPush();
    }
  }, [user]);

  const registerPush = async () => {
    try {
      // 1. Solicitar permissão
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.warn('Permissão de push negada');
        return;
      }

      // 2. Registrar no serviço de push (FCM)
      await PushNotifications.register();

      // 3. Listener para sucesso no registro do Token
      PushNotifications.addListener('registration', async (token) => {
        console.log('Push Token gerado:', token.value);

        // Salvar token no Supabase vinculado ao usuário
        if (user?.id) {
          const { error } = await supabase
            .from('user_push_tokens')
            .upsert({
              user_id: user.id,
              token: token.value,
              platform: Capacitor.getPlatform(),
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,token'
            });

          if (error) console.error('Erro ao salvar push token:', error);
        }
      });

      // 4. Listener para erro no registro
      PushNotifications.addListener('registrationError', (error) => {
        console.error('Erro no registro de push:', error);
      });

      // 5. Listener para notificação recebida (app aberto)
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Notificação recebida:', notification);
        // Aqui poderíamos mostrar um toast customizado
      });

      // 6. Listener para ação na notificação (clique)
      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Ação na notificação:', notification);
        if (notification.notification.data?.path) {
          // Lógica de redirecionamento interno
          window.location.href = notification.notification.data.path;
        }
      });

    } catch (err) {
      console.error('Erro ao configurar Push:', err);
    }
  };
};
