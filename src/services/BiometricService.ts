import { NativeBiometric } from 'capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

export class BiometricService {
  static async isBiometricsEnabled(): Promise<boolean> {
    return await this.isBiometricEnabled();
  }

  static async disableBiometrics(): Promise<void> {
    await this.setBiometricEnabled(false);
  }

  static async enableBiometrics(): Promise<boolean> {
    // Authenticate first before enabling
    const success = await this.authenticate();
    if (success) {
      await this.setBiometricEnabled(true);
      return true;
    }
    return false;
  }
  static async isAvailable(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;

    try {
      const result = await NativeBiometric.isAvailable();
      return result.isAvailable;
    } catch (error) {
      console.error('Biometric availability check failed:', error);
      return false;
    }
  }

  static async authenticate(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;

    try {
      await NativeBiometric.verifyIdentity({
        reason: 'Acesse sua conta com biometria',
        title: 'Login Biométrico',
        subtitle: 'Use sua digital ou rosto para entrar',
        description: 'Autenticação segura ZK Prêmios',
      });
      return true;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return false;
    }
  }

  static async setBiometricEnabled(enabled: boolean) {
    await Preferences.set({
      key: 'biometric_enabled',
      value: enabled ? 'true' : 'false'
    });
  }

  static async isBiometricEnabled(): Promise<boolean> {
    const { value } = await Preferences.get({ key: 'biometric_enabled' });
    return value === 'true';
  }

  static async saveCredentials(email: string, password: string) {
    if (!Capacitor.isNativePlatform()) return;

    try {
      await NativeBiometric.setCredentials({
        username: email,
        password: password,
        server: 'itallozkpremios.com.br',
      });
      await this.setBiometricEnabled(true);
    } catch (error) {
      console.error('Failed to save biometric credentials:', error);
    }
  }

  static async getCredentials(): Promise<{ username: string; password: string } | null> {
    if (!Capacitor.isNativePlatform()) return null;

    try {
      const credentials = await NativeBiometric.getCredentials({
        server: 'itallozkpremios.com.br',
      });
      return {
        username: credentials.username,
        password: credentials.password,
      };
    } catch (error) {
      console.error('Failed to get biometric credentials:', error);
      return null;
    }
  }

  static async deleteCredentials() {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await NativeBiometric.deleteCredentials({
        server: 'itallozkpremios.com.br',
      });
    } catch (error) {
      console.error('Failed to delete biometric credentials:', error);
    }
  }
}
