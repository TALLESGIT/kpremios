# 🔧 Guia Rápido: Correção dos Problemas de Live

## 🎯 Problemas Resolvidos

✅ Mensagens não aparecem no chat  
✅ Métricas não atualizam em tempo real  
✅ Usuários conectados não aparecem para escolher moderadores  

## 🚀 Opção 1: Aplicação Manual (RECOMENDADO - Mais Rápido)

### Passo 1: Acesse o SQL Editor do Supabase

1. Abra: [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto **zkpremios**
3. No menu lateral, clique em **SQL Editor**
4. Clique em **New Query**

### Passo 2: Execute o SQL

1. Abra o arquivo: `supabase/migrations/fix_rpc_functions.sql`
2. **Copie TODO o conteúdo** do arquivo
3. **Cole** no SQL Editor do Supabase
4. Clique em **RUN** (botão verde no canto inferior direito)

### Passo 3: Verifique

Execute este SQL para verificar se as funções foram criadas:

```sql
SELECT 
    routine_name as funcao,
    routine_type as tipo
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN (
        'can_send_message',
        'is_moderator',
        'is_user_banned',
        'get_stream_statistics',
        'count_active_unique_viewers',
        'cleanup_inactive_viewer_sessions',
        'end_all_active_viewer_sessions',
        'clear_stream_data'
    )
ORDER BY routine_name;
```

**Resultado esperado:** 8 funções listadas ✅

---

## 🤖 Opção 2: Via Script Node.js (Automático)

### Requisitos:
- Variável de ambiente `SUPABASE_SERVICE_KEY` configurada

### Passos:

1. **Configure a Service Key:**

   ```bash
   # Windows PowerShell
   $env:SUPABASE_SERVICE_KEY = "sua-service-key-aqui"
   ```

   > 🔑 Encontre sua **service_role key** em:  
   > Dashboard → Project Settings → API → service_role key (secret)

2. **Execute o script:**

   ```bash
   node supabase/apply-rpc-fix.mjs
   ```

---

## 🧪 Teste Após Aplicar

### 1️⃣ Teste o Chat

1. Abra a página de admin da live
2. Inicie uma transmissão (**Iniciar Live**)
3. Em **outra aba/navegador**, abra a página pública da live
4. Envie uma mensagem no chat
5. ✅ A mensagem deve aparecer em **ambas as telas** instantaneamente

### 2️⃣ Teste as Métricas

1. Na página de admin, verifique o **Painel de Métricas**
2. Abra a transmissão em outra aba como espectador
3. ✅ O contador **"Ativos"** deve aumentar
4. ✅ Envie mensagens e veja o contador subir

### 3️⃣ Teste Lista de Moderadores

1. Na página de admin, role até **Moderadores**
2. Verifique a seção **"Usuários na Transmissão"**
3. ✅ Usuários conectados devem aparecer
4. ✅ Clique em **"Promover"** para torná-los moderadores

---

## ❓ Ainda com Problemas?

### Debug no Console

1. Pressione **F12** no navegador
2. Vá na aba **Console**
3. Procure por erros em vermelho
4. Me envie os erros para análise

### Verificar Tabelas

Execute no SQL Editor:

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
        'banned_users',
        'users'
    )
ORDER BY table_name;
```

**Deve retornar 6 tabelas** ✅

---

## 📂 Arquivos Criados

- ✅ `supabase/migrations/fix_rpc_functions.sql` - SQL com todas as funções
- ✅ `supabase/apply-rpc-fix.mjs` - Script Node.js para aplicação automática
- ✅ `TROUBLESHOOTING.md` - Guia detalhado de troubleshooting

---

## 🎯 Resumo Rápido

**OPÇÃO MAIS SIMPLES:**

1. Abra: https://supabase.com/dashboard → Seu Projeto → SQL Editor
2. Copie o conteúdo de `supabase/migrations/fix_rpc_functions.sql`
3. Cole e clique em **RUN**
4. Recarregue sua aplicação (F5)
5. ✅ Tudo funcionando!
