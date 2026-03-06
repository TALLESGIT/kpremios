// =====================================================
// CACHE RESILIENTE - FUNCIONA MESMO SE SUPABASE CAIR
// =====================================================
// Sistema de cache em memória para manter a live funcionando
// mesmo quando o Supabase estiver lento ou indisponível

class ResilientCache {
  constructor() {
    // Cache de usuários (roles, VIP status, etc)
    this.users = new Map();
    
    // Cache de viewers por stream
    this.viewers = new Map();
    
    // Cache de mensagens recentes (últimas 100 por stream)
    this.messages = new Map();
    
    // Cache de enquetes ativas
    this.polls = new Map();
    
    // Cache de streams ativas
    this.streams = new Map();
    
    // Estatísticas de falhas do Supabase
    this.supabaseFailures = 0;
    this.lastSupabaseCheck = Date.now();
    
    console.log('✅ Cache resiliente inicializado');
  }

  // =====================================================
  // USUÁRIOS
  // =====================================================
  
  setUser(userId, userData) {
    this.users.set(userId, {
      ...userData,
      cachedAt: Date.now()
    });
  }

  getUser(userId) {
    const cached = this.users.get(userId);
    if (!cached) return null;
    
    // Cache válido por 5 minutos
    if (Date.now() - cached.cachedAt > 5 * 60 * 1000) {
      this.users.delete(userId);
      return null;
    }
    
    return cached;
  }

  // =====================================================
  // VIEWERS
  // =====================================================
  
  addViewer(streamId, socketId) {
    if (!this.viewers.has(streamId)) {
      this.viewers.set(streamId, new Set());
    }
    this.viewers.get(streamId).add(socketId);
  }

  removeViewer(streamId, socketId) {
    const viewers = this.viewers.get(streamId);
    if (viewers) {
      viewers.delete(socketId);
      if (viewers.size === 0) {
        this.viewers.delete(streamId);
      }
    }
  }

  getViewerCount(streamId) {
    const viewers = this.viewers.get(streamId);
    return viewers ? viewers.size : 0;
  }

  // =====================================================
  // MENSAGENS
  // =====================================================
  
  addMessage(streamId, message) {
    if (!this.messages.has(streamId)) {
      this.messages.set(streamId, []);
    }
    
    const messages = this.messages.get(streamId);
    messages.push({
      ...message,
      cachedAt: Date.now()
    });
    
    // Manter apenas últimas 100 mensagens
    if (messages.length > 100) {
      messages.shift();
    }
  }

  getRecentMessages(streamId, limit = 50) {
    const messages = this.messages.get(streamId);
    if (!messages) return [];
    
    return messages.slice(-limit);
  }

  // =====================================================
  // ENQUETES
  // =====================================================
  
  setPoll(streamId, poll) {
    this.polls.set(streamId, {
      ...poll,
      cachedAt: Date.now()
    });
  }

  getPoll(streamId) {
    return this.polls.get(streamId) || null;
  }

  removePoll(streamId) {
    this.polls.delete(streamId);
  }

  // =====================================================
  // STREAMS
  // =====================================================
  
  setStream(streamId, streamData) {
    this.streams.set(streamId, {
      ...streamData,
      cachedAt: Date.now()
    });
  }

  getStream(streamId) {
    const cached = this.streams.get(streamId);
    if (!cached) return null;
    
    // Cache válido por 1 minuto
    if (Date.now() - cached.cachedAt > 60 * 1000) {
      this.streams.delete(streamId);
      return null;
    }
    
    return cached;
  }

  // =====================================================
  // HEALTH CHECK
  // =====================================================
  
  recordSupabaseFailure() {
    this.supabaseFailures++;
    this.lastSupabaseCheck = Date.now();
    
    if (this.supabaseFailures > 5) {
      console.warn(`⚠️ CACHE: Supabase com ${this.supabaseFailures} falhas - usando cache`);
    }
  }

  recordSupabaseSuccess() {
    if (this.supabaseFailures > 0) {
      console.log(`✅ CACHE: Supabase recuperado após ${this.supabaseFailures} falhas`);
    }
    this.supabaseFailures = 0;
    this.lastSupabaseCheck = Date.now();
  }

  isSupabaseHealthy() {
    // Se teve mais de 3 falhas nos últimos 30 segundos, considerar unhealthy
    const timeSinceLastCheck = Date.now() - this.lastSupabaseCheck;
    return this.supabaseFailures < 3 || timeSinceLastCheck > 30000;
  }

  // =====================================================
  // LIMPEZA
  // =====================================================
  
  cleanup() {
    const now = Date.now();
    
    // Limpar usuários antigos (> 5 minutos)
    for (const [userId, data] of this.users.entries()) {
      if (now - data.cachedAt > 5 * 60 * 1000) {
        this.users.delete(userId);
      }
    }
    
    // Limpar mensagens antigas (> 10 minutos)
    for (const [streamId, messages] of this.messages.entries()) {
      const filtered = messages.filter(msg => now - msg.cachedAt < 10 * 60 * 1000);
      if (filtered.length === 0) {
        this.messages.delete(streamId);
      } else {
        this.messages.set(streamId, filtered);
      }
    }
    
    // Limpar streams antigos (> 1 minuto)
    for (const [streamId, data] of this.streams.entries()) {
      if (now - data.cachedAt > 60 * 1000) {
        this.streams.delete(streamId);
      }
    }
  }

  // =====================================================
  // ESTATÍSTICAS
  // =====================================================
  
  getStats() {
    return {
      users: this.users.size,
      viewers: Array.from(this.viewers.values()).reduce((sum, set) => sum + set.size, 0),
      messages: Array.from(this.messages.values()).reduce((sum, arr) => sum + arr.length, 0),
      polls: this.polls.size,
      streams: this.streams.size,
      supabaseFailures: this.supabaseFailures,
      supabaseHealthy: this.isSupabaseHealthy()
    };
  }
}

// Exportar instância única (singleton)
const cache = new ResilientCache();

// Limpar cache a cada 5 minutos
setInterval(() => {
  cache.cleanup();
  console.log('🧹 Cache limpo:', cache.getStats());
}, 5 * 60 * 1000);

module.exports = cache;
