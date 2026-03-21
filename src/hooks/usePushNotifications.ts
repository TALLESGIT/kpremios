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
      if (typeof (window as any)._pushListenersInitialized !== 'undefined') {
        console.log('Push listeners already initialized, just registering...');
        await PushNotifications.register();
        return;
      }

      // 1. Solicitar permissão
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.warn('Permissão de push negada');
        return;
      }

      // 2. Adicionar Listeners ANTES de registrar
      
      // Listener para sucesso no registro do Token
      await PushNotifications.addListener('registration', async (token) => {
        console.log('Push Token gerado:', token.value);

        // Salvar token no Supabase vinculado ao usuário e ao clube atual
        if (user?.id) {
          try {
            const currentClub = sessionStorage.getItem('session_club') || (user as any).club_slug || 'cruzeiro';
            
            const { error } = await supabase
              .from('user_push_tokens')
              .upsert({
                user_id: user.id,
                token: token.value,
                club_slug: currentClub,
                platform: Capacitor.getPlatform(),
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'token'
              });

            if (error) console.error('Erro ao salvar push token no banco:', error);
            else console.log(`Push token salvo com sucesso para o usuário ${user.id} no clube ${currentClub}`);
          } catch (e) {
            console.error('Exceção ao salvar push token:', e);
          }
        }
      });

      // Listener para erro no registro
      await PushNotifications.addListener('registrationError', (error) => {
        console.error('Erro no registro de push:', error);
      });

      // Listener para notificação recebida (app aberto)
      await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Notificação recebida com app aberto:', notification);
      });

      // Listener para ação na notificação (clique)
      await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Usuário clicou na notificação:', notification);
        const path = notification.notification.data?.path;
        if (path) {
          console.log('Redirecionando para:', path);
          window.location.href = path;
        }
      });

      // Marcar como inicializado globalmente (evita duplicar listeners no re-render)
      (window as any)._pushListenersInitialized = true;

      // 3. Registrar no serviço de push (FCM)
      await PushNotifications.register();

    } catch (err) {
      console.error('Erro crítico ao configurar Push Notifications:', err);
    }
  };
};
