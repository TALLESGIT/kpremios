# 🔧 Correção dos Problemas de Live Streaming

## 📋 Problemas Identificados

### 1. **Mensagens não aparecem no chat**
- **Causa**: A função RPC `can_send_message` não existe no banco de dados
- **Onde**: `LiveChat.tsx` linha 103
- **Efeito**: Mensagens não são enviadas

### 2. **Painel de Métricas não atualiza em tempo real**
- **Causa**: Funções RPC ausentes:
  - `get_stream_statistics`
  - `cleanup_inactive_viewer_sessions`
  - `count_active_unique_viewers`
- **Onde**: `AdminLivePanel.tsx`
- **Efeito**: Estatísticas ficam zeradas ou não atualizam

### 3. **Usuários conectados não aparecem para escolher moderadores**
- **Causa**: Estrutura das tabelas ou permissões incorretas
- **Onde**: `ModeratorManager.tsx` linhas 189-215
- **Efeito**: Lista de participantes fica vazia

## ✅ Solução

### Passo 1: Aplicar as Funções RPC no Supabase

Você tem **duas opções**:

#### Opção A: Aplicar via Supabase Dashboard (Recomendado)

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **SQL Editor** (menu lateral esquerdo)
4. Clique em **New Query**
5. Copie todo o conteúdo do arquivo `supabase/migrations/fix_rpc_functions.sql`
6. Cole no editor
7. Clique em **Run** (botão verde no canto inferior direito)

#### Opção B: Aplicar via CLI (Se você tem Supabase CLI instalado)

```bash
# Na pasta do projeto
supabase db push
```

### Passo 2: Verificar as Tabelas

Execute este SQL no **SQL Editor** do Supabase para verificar se as tabelas necessárias existem:

```sql
-- Verificar se as tabelas existem
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'live_streams',
    'viewer_sessions',
    'live_chat_messages',
    'stream_moderators',
    'banned_users'
  )
ORDER BY table_name;
```

Se alguma tabela estiver faltando, me avise que eu crio a migration para ela.

### Passo 3: Verificar Permissões RLS

Execute este SQL para garantir que as permissões estejam corretas:

```sql
-- Verificar políticas RLS
SELECT tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('live_streams', 'viewer_sessions', 'live_chat_messages', 'stream_moderators', 'banned_users');
```

## 🧪 Teste Após Aplicar

### Teste 1: Chat
1. Abra a página de admin da live
2. Inicie uma transmissão
3. Em outra aba/navegador, abra a página pública da live como usuário
4. Envie uma mensagem
5. ✅ A mensagem deve aparecer em ambas as telas

### Teste 2: Métricas
1. Na página de admin, verifique o **Painel de Métricas**
2. Abra a transmissão em outra aba como espectador
3. ✅ O contador de "Ativos" deve aumentar
4. ✅ Mensagens enviadas devem incrementar o contador

### Teste 3: Lista de Moderadores
1. Na página de admin, role até **Moderadores**
2. Verifique a seção **Usuários na Transmissão**
3. ✅ Usuários conectados devem aparecer na lista
4. ✅ Você deve poder promovê-los a moderadores

## 📞 Próximos Passos

Depois de aplicar o SQL:
1. Recarregue a página da aplicação (F5)
2. Teste cada funcionalidade
3. Me avise se algum problema persistir

## 🐛 Debug Adicional

Se os problemas continuarem, verifique o console do navegador (F12 → Console) e procure por erros. Me envie os erros que encontrar.
