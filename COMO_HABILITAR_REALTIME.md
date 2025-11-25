# 🔧 Como Habilitar o Realtime no Supabase

## ⚠️ Problema: Erro de Conexão WebSocket

Se você está vendo erros como:
```
WebSocket connection to 'wss://...supabase.co/realtime/v1/websocket' failed
```

Isso significa que o **Supabase Realtime** não está habilitado ou configurado corretamente no seu projeto.

---

## ✅ Solução: Habilitar Realtime no Dashboard

### **Passo 1: Acessar o Dashboard do Supabase**

1. Acesse: https://app.supabase.com
2. Entre no seu projeto
3. Vá em **Database** → **Replication** (ou **Realtime**)

### **Passo 2: Habilitar Realtime para as Tabelas**

Para que o Realtime funcione, você precisa habilitar a **replicação** nas tabelas que você quer monitorar em tempo real.

#### **Tabelas que precisam de Realtime habilitado:**

1. ✅ **live_chat_messages** - Para chat ao vivo
2. ✅ **live_games** - Para jogos ao vivo
3. ✅ **live_participants** - Para participantes de jogos
4. ✅ **numbers** - Para atualizações de números
5. ✅ **users** - Para atualizações de usuários
6. ✅ **extra_number_requests** - Para solicitações pendentes
7. ✅ **draw_results** - Para resultados de sorteios
8. ✅ **raffles** - Para rifas
9. ✅ **profiles** - Para perfis de usuários

### **Passo 3: Habilitar Replicação (Método 1 - Via Dashboard)**

1. No Dashboard do Supabase, vá em **Database** → **Replication**
2. Para cada tabela listada acima:
   - Clique no toggle ao lado da tabela
   - Ative a replicação
   - Salve as alterações

### **Passo 4: Habilitar Replicação (Método 2 - Via SQL)**

Execute este SQL no **SQL Editor** do Supabase:

```sql
-- Habilitar Realtime para todas as tabelas necessárias

-- Chat ao vivo
ALTER PUBLICATION supabase_realtime ADD TABLE live_chat_messages;

-- Jogos ao vivo
ALTER PUBLICATION supabase_realtime ADD TABLE live_games;
ALTER PUBLICATION supabase_realtime ADD TABLE live_participants;

-- Sistema de números e solicitações
ALTER PUBLICATION supabase_realtime ADD TABLE numbers;
ALTER PUBLICATION supabase_realtime ADD TABLE extra_number_requests;

-- Usuários e perfis
ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- Sorteios e resultados
ALTER PUBLICATION supabase_realtime ADD TABLE draw_results;
ALTER PUBLICATION supabase_realtime ADD TABLE raffles;
```

### **Passo 5: Verificar se Funcionou**

1. Recarregue a aplicação
2. Abra o **Console do Navegador** (F12)
3. Os erros de WebSocket devem desaparecer
4. As funcionalidades em tempo real devem funcionar

---

## 🔍 Verificar Status do Realtime

### **Via Dashboard:**

1. Vá em **Database** → **Replication**
2. Verifique se as tabelas estão com o toggle **ativado** (verde)

### **Via SQL:**

Execute este SQL para ver quais tabelas estão habilitadas:

```sql
SELECT 
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
```

---

## 🚨 Problemas Comuns

### **1. Erro: "publication does not exist"**

**Solução:** O Realtime pode não estar habilitado no projeto. Verifique:
- Vá em **Settings** → **API**
- Verifique se o Realtime está ativo

### **2. Erro: "permission denied"**

**Solução:** Você precisa ser o dono do projeto ou ter permissões de administrador.

### **3. Realtime não funciona mesmo após habilitar**

**Solução:**
1. Verifique se você está usando a chave API correta (`anon key`)
2. Limpe o cache do navegador
3. Recarregue a página
4. Verifique os logs do Realtime no Dashboard: **Database** → **Realtime Logs**

---

## 📚 Documentação Oficial

- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [Enabling Realtime](https://supabase.com/docs/guides/realtime/postgres-changes#enable-realtime)

---

## ✅ Checklist

- [ ] Acessei o Dashboard do Supabase
- [ ] Fui em **Database** → **Replication**
- [ ] Habilitei a replicação para todas as tabelas necessárias
- [ ] Executei o SQL (se necessário)
- [ ] Recarreguei a aplicação
- [ ] Verifiquei que os erros de WebSocket desapareceram
- [ ] Testei as funcionalidades em tempo real (chat, atualizações, etc.)

---

**Pronto!** 🎉 Após seguir estes passos, o Realtime deve funcionar corretamente.

