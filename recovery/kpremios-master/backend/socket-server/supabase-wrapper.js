// =====================================================
// SUPABASE WRAPPER - COM FALLBACK PARA CACHE
// =====================================================
// Wrapper que tenta usar Supabase, mas cai para cache se falhar
// Garante que a live NUNCA caia por problemas no Supabase

const cache = require('./resilient-cache');

class SupabaseWrapper {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.timeout = 3000; // 3 segundos - resiliência: não travar Node à espera do banco
    
    // ✅ THROTTLE: Atualizar viewer_count no Supabase apenas a cada 15-20s (reduz CPU)
    this.viewerCountThrottle = new Map(); // streamId -> timestamp da última atualização
    this.VIEWER_COUNT_UPDATE_INTERVAL = 15000; // 15 segundos
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
    // Read-through: primeiro tenta cache (evita 90% das consultas ao banco)
    const cached = cache.getUser(userId);
    if (cached) {
      return { data: cached, error: null, fromCache: true };
    }
    return this.executeWithFallback(
      async () => {
        const { data, error } = await this.supabase
          .from('users')
          .select('id, name, is_vip, is_admin, vip_color')
          .eq('id', userId)
          .maybeSingle();
        
        if (error) throw error;
        if (!data) return null;
        // Tabela users tem 'name', não 'username' — evitar referência a coluna inexistente
        const normalized = { ...data, name: data.name || 'Usuário' };
        cache.setUser(userId, normalized);
        return normalized;
      },
      async () => {
        return cache.getUser(userId) || {
          id: userId,
          name: 'Usuário',
          is_vip: false,
          is_admin: false,
          vip_color: null
        };
      },
      'getUser'
    );
  }

  // =====================================================
  // SALVAR MENSAGEM (single - fallback)
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
        
        cache.addMessage(messageData.stream_id, data);
        return data;
      },
      async () => {
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
  // BATCH INSERT (Write-Behind) - reduz 90% das escritas
  // =====================================================
  
  async bulkInsertMessages(rows) {
    if (!rows || rows.length === 0) return { data: [], error: null };
    return this.executeWithFallback(
      async () => {
        const { data, error } = await this.supabase
          .from('live_chat_messages')
          .insert(rows)
          .select();

        if (error) throw error;

        (data || []).forEach(m => {
          if (m.stream_id) cache.addMessage(m.stream_id, m);
        });
        return data || [];
      },
      async () => {
        rows.forEach(r => {
          cache.addMessage(r.stream_id, {
            ...r,
            id: `cache-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            created_at: new Date().toISOString(),
            likes: 0
          });
        });
        return rows;
      },
      'bulkInsertMessages'
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
    
    // ✅ THROTTLE: Atualizar Supabase apenas a cada 10 segundos
    const now = Date.now();
    const lastUpdate = this.viewerCountThrottle.get(streamId) || 0;
    
    if (now - lastUpdate < this.VIEWER_COUNT_UPDATE_INTERVAL) {
      // Ignorar atualização (throttle)
      return { data: { viewer_count: viewers }, error: null, fromCache: true };
    }
    
    // Atualizar timestamp
    this.viewerCountThrottle.set(streamId, now);
    
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
