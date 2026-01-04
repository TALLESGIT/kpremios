# ✅ CORREÇÃO APLICADA - Políticas RLS para live_streams

## 🔧 O QUE FOI CORRIGIDO

### Problema:
- ZK Studio retornava `Array(0)` ao buscar streams
- Política RLS só permitia leitura de streams **ativas** para usuários anônimos
- ZK Studio precisa ler streams **inativas** para poder ativá-las

### Solução Aplicada:

1. **Política de Leitura Pública:**
   ```sql
   CREATE POLICY "Anyone can read all streams"
   ON live_streams
   FOR SELECT
   TO public
   USING (true);
   ```
   - Permite que **qualquer usuário** (incluindo anônimos) leia **todas** as streams
   - Necessário para o ZK Studio encontrar a stream antes de ativá-la

2. **Política de Atualização Pública:**
   ```sql
   CREATE POLICY "Public can update stream status"
   ON live_streams
   FOR UPDATE
   TO public
   USING (true)
   WITH CHECK (true);
   ```
   - Permite que usuários anônimos atualizem streams
   - Necessário para o ZK Studio notificar quando inicia/encerra transmissão

## ✅ STATUS ATUAL

- ✅ Tabela `live_streams` existe
- ✅ Registro `zktv` existe (ID: `782c6760-a95d-4e03-8936-994580d8d4cd`)
- ✅ Políticas RLS corrigidas
- ✅ ZK Studio pode ler streams
- ✅ ZK Studio pode atualizar streams

## 🎯 PRÓXIMOS PASSOS

1. **No ZK Studio:**
   - Adicionar código de notificação do Supabase (ver `ZK_STUDIO_SUPABASE_SYNC.md`)
   - Quando iniciar transmissão, chamar `notifySupabaseStreamStarted('zktv')`

2. **Testar:**
   - ZK Studio inicia transmissão
   - ZK Studio atualiza Supabase
   - Site detecta mudança via Realtime
   - Player HLS aparece automaticamente

## 📋 VERIFICAÇÃO

Para verificar se está funcionando, execute no Supabase SQL Editor:

```sql
-- Ver streams disponíveis
SELECT id, channel_name, title, is_active, hls_url 
FROM live_streams;

-- Ver políticas ativas
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'live_streams';
```

**Tudo corrigido!** ✅

