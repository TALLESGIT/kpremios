// =====================================================
// SUPABASE WRAPPER - COM FALLBACK PARA CACHE
// =====================================================
// Wrapper que tenta usar Supabase, mas cai para cache se falhar
// Garante que a live NUNCA caia por problemas no Supabase

const cache = require('./resilient-cache');

class SupabaseWrapper {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.timeout = 5000; // 5 segundos de timeout
  }

  // =====================================================
  // HELPER: EXECUTAR COM TIMEOUT E FALLBACK
  // =====================================================
  
  async executeWithFallback(operation, fallback, operationName = 'operation') {
    try {
      // Criar promise com timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), this.timeout);
      });

      // Executar operação com timeout
      const result = await Promise.race([operation(), timeoutPromise]);
      
      // Se chegou aqui, sucesso!
      cache.recordSupabaseSuccess();
      return { data: result, error: null, fromCache: false };
      
    } catch (error) {
      console.warn(`⚠️ ${operationName} falhou, usando cache:`, error.message);
      cache.recordSupabaseFailure();
      
      // Usar fallback (cache)
      const cachedData = await fallback();
      return { data: cachedData, error: null, fromCache: true };
    }
  }

  // =====================================================
  // BUSCAR USUÁRIO
  // =====================================================
  
  async getUser(userId) {
    return this.executeWithFallback(
      async () => {
        const { data, error } = await this.supabase
          .from('users')
          .select('id, username, is_vip, is_admin, vip_color')
          .eq('id', userId)
          .single();
        
        if (error) throw error;
        
        // Salvar no cache
        cache.setUser(userId, data);
        return data;
      },
      async () => {
        // Fallback: buscar do cache
        return cache.getUser(userId) || {
          id: userId,
          username: 'Usuário',
          is_vip: false,
          is_admin: false,
          vip_color: null
        };
      },
      'getUser'
    );
  }

  // =====================================================
  // SALVAR MENSAGEM
  // =====================================================
  
  async saveMessage(messageData) {
    return this.executeWithFallback(
      async () => {
        const { data, error } = await this.supabase
          .from('live_chat_messages')
          .insert([messageData])
          .select()
          .single();
        
        if (error) throw error;
        
        // Salvar no cache
        cache.addMessage(messageData.stream_id, data);
        return data;
      },
      async () => {
        // Fallback: apenas adicionar ao cache
        const cachedMessage = {
          ...messageData,
          id: `cache-${Date.now()}`,
          created_at: new Date().toISOString(),
          likes: 0
        };
        cache.addMessage(messageData.stream_id, cachedMessage);
        return cachedMessage;
      },
      'saveMessage'
    );
  }

  // =====================================================
  // BUSCAR ENQUETE ATIVA
  // =====================================================
  
  async getActivePoll(streamId) {
    return this.executeWithFallback(
      async () => {
        const { data, error } = await this.supabase
          .from('stream_polls')
          .select('*')
          .eq('stream_id', streamId)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (error) throw error;
        
        // Salvar no cache
        if (data) {
          cache.setPoll(streamId, data);
        } else {
          cache.removePoll(streamId);
        }
        return data;
      },
      async () => {
        // Fallback: buscar do cache
        return cache.getPoll(streamId);
      },
      'getActivePoll'
    );
  }

  // =====================================================
  // BUSCAR STREAM
  // =====================================================
  
  async getStream(streamId) {
    return this.executeWithFallback(
      async () => {
        const { data, error } = await this.supabase
          .from('live_streams')
          .select('*')
          .eq('id', streamId)
          .single();
        
        if (error) throw error;
        
        // Salvar no cache
        cache.setStream(streamId, data);
        return data;
      },
      async () => {
        // Fallback: buscar do cache
        return cache.getStream(streamId) || {
          id: streamId,
          is_active: true,
          title: 'Live',
          viewer_count: cache.getViewerCount(streamId)
        };
      },
      'getStream'
    );
  }

  // =====================================================
  // ATUALIZAR CONTAGEM DE VIEWERS
  // =====================================================
  
  async updateViewerCount(streamId, count) {
    // Sempre atualizar o cache primeiro (instantâneo)
    const viewers = cache.getViewerCount(streamId);
    
    // Tentar atualizar no Supabase (não bloquear se falhar)
    this.supabase
      .from('live_streams')
      .update({ viewer_count: viewers })
      .eq('id', streamId)
      .then(() => {
        cache.recordSupabaseSuccess();
      })
      .catch((error) => {
        console.warn('⚠️ Erro ao atualizar viewer_count no Supabase:', error.message);
        cache.recordSupabaseFailure();
      });
    
    // Retornar imediatamente com o valor do cache
    return { data: { viewer_count: viewers }, error: null, fromCache: true };
  }

  // =====================================================
  // LIKE EM MENSAGEM
  // =====================================================
  
  async toggleMessageLike(messageId, userId) {
    return this.executeWithFallback(
      async () => {
        const { data, error } = await this.supabase
          .rpc('toggle_message_like', {
            p_message_id: messageId,
            p_user_id: userId
          });
        
        if (error) throw error;
        return data;
      },
      async () => {
        // Fallback: retornar valor padrão
        console.warn('⚠️ Like não salvo no banco (Supabase indisponível)');
        return { liked: true, likes_count: 1 };
      },
      'toggleMessageLike'
    );
  }

  // =====================================================
  // HEALTH CHECK
  // =====================================================
  
  isHealthy() {
    return cache.isSupabaseHealthy();
  }

  getStats() {
    return cache.getStats();
  }
}

module.exports = SupabaseWrapper;
