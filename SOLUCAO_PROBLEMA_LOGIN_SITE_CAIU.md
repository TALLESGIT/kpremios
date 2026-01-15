# Solução: Problema de Login Após Site Cair

## Problema Identificado

O site caiu enquanto o admin estava em live e agora não é possível fazer login. Os logs do Supabase mostram problemas críticos:

### 1. **Problema Principal: Timeout de Conexão do Supabase Auth**
```
failed to connect to `host=localhost user=supabase_auth_admin database=postgres`: 
dial error (timeout: dial tcp [::1]:5432: i/o timeout)
```

**Erros nos logs:**
- Múltiplos erros `504: Processing this request timed out`
- `500: Database error finding user`
- `500: Database error querying schema`
- Timeouts de ~10 segundos em tentativas de login/signup

### 2. **Problema Secundário: Constraint Violations**
```
duplicate key value violates unique constraint "idx_viewer_sessions_unique"
duplicate key value violates unique constraint "viewer_sessions_session_stream_unique"
```

**Causa:** A função `trackViewer` está tentando criar sessões duplicadas quando há múltiplas tentativas simultâneas.

### 3. **Problema de Lock no Banco**
```
process 153073 still waiting for RowExclusiveLock on relation 17109 of database 5 after 1387.103 ms
```

**Causa:** O banco está sobrecarregado com muitas operações simultâneas.

## Causa Raiz

O banco de dados do Supabase está **sobrecarregado** ou com **problemas de infraestrutura**, impedindo:
- ✅ Login/autenticação de usuários
- ✅ Criação de sessões de viewer
- ✅ Chamadas à função `grant_free_vip_if_eligible`
- ✅ Operações de escrita no banco

## Soluções Implementadas

### 1. **Tratamento Melhorado de Erros no `trackViewer`**

**Arquivo:** `src/pages/PublicLiveStreamPage.tsx`

**Melhorias:**
- ✅ Tratamento específico para erros de constraint (duplicação) - não bloqueia o fluxo
- ✅ Tratamento de timeouts e erros de conexão - tenta novamente na próxima vez
- ✅ Fallback para atualizar sessão existente quando há erro de duplicação
- ✅ Todos os erros são tratados como não-críticos para não quebrar a aplicação

**Resultado:** A aplicação continua funcionando mesmo quando há problemas de banco de dados.

### 2. **Documentação do Problema**

Este documento foi criado para explicar o problema e as soluções.

## Próximos Passos Recomendados

### Imediato (para restaurar o serviço):

1. **Verificar status do Supabase:**
   - Acesse o dashboard do Supabase
   - Verifique se há incidentes reportados
   - Monitore o uso de CPU/Memória do banco

2. **Limpar sessões órfãs:**
   ```sql
   -- Limpar sessões inativas há mais de 1 hora
   DELETE FROM viewer_sessions 
   WHERE is_active = false 
   AND ended_at < NOW() - INTERVAL '1 hour';
   ```

3. **Verificar conexões abertas:**
   ```sql
   SELECT count(*) FROM pg_stat_activity 
   WHERE state = 'active' 
   AND datname = 'postgres';
   ```

### Médio Prazo (para prevenir):

1. **Adicionar rate limiting no frontend:**
   - Limitar tentativas de `trackViewer` a 1x por 30 segundos
   - Implementar exponential backoff para retries

2. **Otimizar queries:**
   - Adicionar índices se necessário
   - Revisar queries que podem estar causando locks

3. **Monitoramento:**
   - Configurar alertas para alta latência no banco
   - Monitorar métricas de conexão

## Como Testar

1. **Limpar cache do navegador:**
   - Abrir DevTools (F12)
   - Application > Clear storage > Clear site data

2. **Tentar fazer login novamente:**
   - Se ainda falhar, aguardar alguns minutos
   - O problema pode ser temporário de infraestrutura

3. **Verificar logs do Supabase:**
   - Dashboard > Logs > Auth
   - Verificar se ainda há erros de timeout

## Status

✅ **Código corrigido** - Tratamento de erros melhorado
⚠️ **Infraestrutura** - Pode estar sobrecarregada (verificar Supabase)
⏳ **Aguardando** - Pode ser necessário aguardar estabilização do banco

## Nota Importante

O problema **não é no código**, mas na **infraestrutura do Supabase**. O código foi melhorado para ser mais resiliente, mas o problema de login só será resolvido quando o Supabase estabilizar.

**Ações recomendadas:**
1. Aguardar alguns minutos e tentar novamente
2. Verificar o status do Supabase no dashboard
3. Se persistir, considerar escalar o plano do Supabase ou contatar suporte
