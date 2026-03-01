import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zkoficial.premios',
  appName: 'ZkOficial',
  webDir: 'dist',
  server: {
    // Permitir conexões com APIs externas (Supabase, Socket.IO, MediaMTX)
    allowNavigation: [
      'bukigyhhgrtgryklabjg.supabase.co',
      'api.zkoficial.com.br',
      'stream.zkoficial.com.br',
      '*.zkoficial.com.br',
      'zk-live.com',
      '*.zk-live.com'
    ]
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  }
};

export default config;
