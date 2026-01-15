# Correção: Erros de Duplicação em viewer_sessions

## Problemas Identificados nos Logs

### 1. **Índices Únicos Conflitantes**
```
duplicate key value violates unique constraint "idx_viewer_sessions_unique"
duplicate key value violates unique constraint "viewer_sessions_session_stream_unique"
```

**Causa:** Havia DOIS índices únicos na mesma combinação de colunas:
- `idx_viewer_sessions_unique`: UNIQUE (session_id, stream_id) WHERE is_active = true
- `viewer_sessions_session_stream_unique`: UNIQUE (session_id, stream_id) sem WHERE

Isso causava conflitos quando múltiplas tentativas simultâneas tentavam criar/atualizar sessões.

### 2. **Tabela `banned_users` Inexistente**
```
relation "banned_users" does not exist
```

**Causa:** A função `is_user_banned` estava tentando acessar a tabela `banned_users` que não existe. O correto é usar `chat_bans`.

### 3. **Locks Longos**
```
process 981 acquired ExclusiveLock on tuple (1,14) of relation 67856 of database 5 after 2772.104 ms
```

**Causa:** Race conditions na criação/atualização de sessões causavam contenção e locks.

## Correções Aplicadas

### ✅ 1. Remoção do Índice Duplicado

**Migration:** `fix_duplicate_viewer_sessions_constraints`

```sql
DROP INDEX IF EXISTS idx_viewer_sessions_unique;
```

- Removido o índice `idx_viewer_sessions_unique` que era redundante
- Mantido apenas `viewer_sessions_session_stream_unique` que já cobre a necessidade
- Elimina conflitos entre índices únicos

### ✅ 2. Correção da Função `is_user_banned`

```sql
CREATE OR REPLACE FUNCTION is_user_banned(p_user_id uuid, p_stream_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM chat_bans 
        WHERE user_id = p_user_id 
          AND stream_id = p_stream_id
          AND (expires_at IS NULL OR expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

- Corrigida para usar `chat_bans` ao invés de `banned_users`
- Agora verifica corretamente se o ban ainda está ativo (não expirado)

### ✅ 3. Melhoria no Código: Uso de `upsert`

**Arquivo:** `src/pages/PublicLiveStreamPage.tsx`

**Antes:** Verificava se existe → Insert ou Update (race condition)

**Depois:** Usa `upsert` atômico que resolve o conflito automaticamente:

```typescript
const result = await supabase
  .from('viewer_sessions')
  .upsert(
    {
      stream_id: currentStream.id,
      session_id: sessionId,
      user_id: user?.id || null,
      is_active: currentStream.is_active,
      user_agent: navigator.userAgent,
      last_heartbeat: now,
      started_at: now
    },
    {
      onConflict: 'session_id,stream_id'
    }
  )
  .select();
```

**Benefícios:**
- ✅ Operação atômica (não há race conditions)
- ✅ Elimina necessidade de verificar se existe antes
- ✅ Reduz locks e contenção no banco
- ✅ Mais eficiente e rápido

## Resultado Esperado

Após essas correções:
- ✅ **Sem erros de duplicação** - O upsert resolve conflitos automaticamente
- ✅ **Sem erros de tabela inexistente** - Função corrigida usa `chat_bans`
- ✅ **Menos locks** - Operação atômica reduz contenção
- ✅ **Melhor performance** - Menos queries e operações mais rápidas

## Status

✅ **Migration aplicada** - Índice duplicado removido  
✅ **Função corrigida** - `is_user_banned` usa `chat_bans`  
✅ **Código melhorado** - Usa `upsert` atômico  

Os erros de duplicação devem parar de aparecer nos logs.
