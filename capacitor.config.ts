import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zkoficial.premios',
  appName: 'ZK Oficial',
  webDir: 'dist',
  server: {
    // Permitir conexões com APIs externas (Supabase, Socket.IO, MediaMTX)
    allowNavigation: [
      'bukigyhhgrtgryklabjg.supabase.co',
      'api.zkoficial.com.br',
      'stream.zkoficial.com.br',
      '*.zkoficial.com.br'
    ]
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  }
};

export default config;
