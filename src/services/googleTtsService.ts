/**
 * Serviço para Text-to-Speech usando Google Cloud via Supabase Edge Function
 */

interface TTSResponse {
  audioContent: string; // Base64 encoded audio
  audioEncoding: string;
  textLength: number;
}

interface TTSOptions {
  text: string;
  languageCode?: string;
  voiceName?: string;
  speakingRate?: number; // 0.25 a 4.0, padrão 1.0
}

class GoogleTTSService {
  /**
   * Alias para synthesizeSpeech para compatibilidade
   */
  async synthesize(text: string): Promise<string | null> {
    return this.synthesizeSpeech({ text });
  }
  private supabaseUrl: string;

  constructor() {
    this.supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';

    if (!this.supabaseUrl) {
      console.warn('VITE_SUPABASE_URL não configurada. TTS pode não funcionar.');
    }
  }

  /**
   * Converte texto em áudio usando Google Cloud TTS
   */
  async synthesizeSpeech(options: TTSOptions): Promise<string | null> {
    try {
      const { text, languageCode = 'pt-BR', voiceName, speakingRate = 0.7 } = options;

      if (!text || text.trim().length === 0) {
        throw new Error('Texto não pode estar vazio');
      }

      if (!this.supabaseUrl) {
        throw new Error('Supabase URL não configurada');
      }

      // Chamar Edge Function do Supabase
      const response = await fetch(`${this.supabaseUrl}/functions/v1/text-to-speech`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          text: text.trim(),
          languageCode,
          voiceName,
          speakingRate
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erro ao sintetizar áudio:', errorData);
        throw new Error(errorData.error || 'Erro ao sintetizar áudio');
      }

      const data: TTSResponse = await response.json();

      if (!data.audioContent) {
        throw new Error('Nenhum conteúdo de áudio recebido');
      }

      // Converter base64 para URL de dados
      return `data:audio/mp3;base64,${data.audioContent}`;

    } catch (error: any) {
      console.error('Erro no serviço TTS:', error);
      return null;
    }
  }

  /**
   * Reproduz áudio a partir de uma URL de dados
   */
  playAudio(audioDataUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio(audioDataUrl);

      // Configurar volume máximo para garantir audibilidade
      audio.volume = 1.0;

      // Event listeners
      audio.onended = () => {
        console.log('✅ Áudio reproduzido com sucesso');
        resolve();
      };

      audio.onerror = (error) => {
        console.error('❌ Erro ao reproduzir áudio:', error);
        reject(error);
      };

      // Tentar reproduzir
      audio.play()
        .then(() => {
          console.log('🔊 Áudio iniciado');
        })
        .catch((error) => {
          console.error('❌ Erro ao iniciar reprodução:', error);
          reject(error);
        });
    });
  }

  /**
   * Sintetiza e reproduz áudio diretamente
   */
  async speak(options: TTSOptions): Promise<void> {
    const audioUrl = await this.synthesizeSpeech(options);

    if (!audioUrl) {
      throw new Error('Falha ao sintetizar áudio');
    }

    await this.playAudio(audioUrl);
  }
}

export const googleTtsService = new GoogleTTSService();
export default googleTtsService;

