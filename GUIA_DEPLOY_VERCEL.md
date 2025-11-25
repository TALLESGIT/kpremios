# 🚀 Guia Rápido: Deploy no Vercel com Variáveis de Ambiente

## 📋 **Passo a Passo Completo**

### **1. Preparar o Projeto Localmente**

Antes de fazer deploy, certifique-se de que seu `.env` local está configurado:

```env
VITE_AGORA_APP_ID=85e4678fde454a80b3445015f9ae6d75
VITE_SUPABASE_URL=https://bukigyhhgrtgryklabjg.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-aqui
# VITE_AGORA_TOKEN= (opcional - apenas se usar token)
```

---

### **2. Fazer Login no Vercel**

1. Acesse: **https://vercel.com**
2. Faça login com GitHub (ou crie uma conta)
3. Conecte seu repositório GitHub

---

### **3. Adicionar Variáveis de Ambiente no Vercel**

#### **Opção A: Durante o Deploy (Primeira Vez)**

1. Ao fazer o primeiro deploy, o Vercel vai perguntar sobre variáveis de ambiente
2. Clique em **"Environment Variables"**
3. Adicione cada variável uma por uma

#### **Opção B: Após o Deploy (Recomendado)**

1. Acesse seu projeto no Vercel: **https://vercel.com/dashboard**
2. Clique no seu projeto
3. Vá em **Settings** (Configurações) → **Environment Variables**
4. Adicione as seguintes variáveis:

---

### **4. Variáveis Obrigatórias para Adicionar**

Adicione **UMA POR VEZ** clicando em **"Add New"**:

#### **✅ Variável 1: Agora App ID**
```
Name: VITE_AGORA_APP_ID
Value: 85e4678fde454a80b3445015f9ae6d75
Environment: Production, Preview, Development (marque todos)
```

#### **✅ Variável 2: Supabase URL**
```
Name: VITE_SUPABASE_URL
Value: https://bukigyhhgrtgryklabjg.supabase.co
Environment: Production, Preview, Development (marque todos)
```

#### **✅ Variável 3: Supabase Anon Key**
```
Name: VITE_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1a2lneWhoZ3J0Z3J5a2xhYmpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNDk5NTcsImV4cCI6MjA3MjkyNTk1N30.Fj4f7LatljCx8SUFgH6un_jldg5eXrI37XB4DK7vSog
Environment: Production, Preview, Development (marque todos)
```

#### **⚠️ Variável 4: Agora Token (OPCIONAL)**
```
Name: VITE_AGORA_TOKEN
Value: (deixe vazio se usar App ID Only, ou cole o token se usar)
Environment: Production, Preview, Development (marque todos)
```

**Nota:** Se seu projeto Agora.io está configurado para "App ID Only", você **NÃO precisa** adicionar o token.

---

### **5. Visualização no Vercel Dashboard**

```
┌─────────────────────────────────────────────────┐
│  Settings > Environment Variables                │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │ Name: VITE_AGORA_APP_ID                   │  │
│  │ Value: 85e4678fde454a80b3445015f9ae6d75   │  │
│  │ ☑ Production  ☑ Preview  ☑ Development  │  │
│  │ [Save] [Cancel]                           │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │ Name: VITE_SUPABASE_URL                   │  │
│  │ Value: https://bukigyhhgrtgryklabjg...   │  │
│  │ ☑ Production  ☑ Preview  ☑ Development  │  │
│  │ [Save] [Cancel]                           │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │ Name: VITE_SUPABASE_ANON_KEY              │  │
│  │ Value: eyJhbGciOiJIUzI1NiIsInR5cCI6...   │  │
│  │ ☑ Production  ☑ Preview  ☑ Development  │  │
│  │ [Save] [Cancel]                           │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
│  [+ Add New]                                    │
└─────────────────────────────────────────────────┘
```

---

### **6. Fazer Redeploy**

**IMPORTANTE:** Após adicionar as variáveis, você **DEVE** fazer redeploy:

1. Vá em **Deployments**
2. Clique nos **3 pontinhos** (⋯) do último deploy
3. Clique em **"Redeploy"**
4. Ou faça um novo commit e push (o Vercel faz deploy automaticamente)

---

### **7. Verificar se Funcionou**

Após o redeploy:

1. Acesse sua URL de produção (ex: `https://seu-projeto.vercel.app`)
2. Tente iniciar uma transmissão ao vivo
3. Verifique o console do navegador (F12) para erros
4. Se aparecer erro de App ID, as variáveis não foram carregadas corretamente

---

## ✅ **Checklist Final**

- [ ] Variáveis adicionadas no Vercel
- [ ] Todas marcadas para Production, Preview e Development
- [ ] Redeploy feito após adicionar variáveis
- [ ] Testado em produção
- [ ] Transmissão funcionando
- [ ] Chat funcionando

---

## 🆘 **Problemas Comuns**

### **"App ID não encontrado em produção"**

**Solução:**
1. Verifique se adicionou `VITE_AGORA_APP_ID` no Vercel
2. Verifique se marcou **Production** ao adicionar
3. Faça **Redeploy** após adicionar
4. Limpe o cache do navegador (Ctrl+Shift+R)

### **"Variáveis não aparecem"**

**Solução:**
1. Certifique-se de que o nome está **EXATO**: `VITE_AGORA_APP_ID` (com VITE_ no início)
2. Verifique se não há espaços extras
3. Faça redeploy após adicionar

### **"Erro de token em produção"**

**Solução:**
1. Se usar "App ID Only", **NÃO** adicione `VITE_AGORA_TOKEN`
2. Se usar token, gere um novo token no console.agora.io
3. Configure o projeto Agora.io para "App ID Only" nas configurações

---

## 📸 **Onde Encontrar no Vercel:**

```
Dashboard → Seu Projeto → Settings → Environment Variables
```

---

## 🎯 **Resumo Rápido:**

1. **Acesse:** https://vercel.com/dashboard
2. **Vá em:** Settings → Environment Variables
3. **Adicione:**
   - `VITE_AGORA_APP_ID` = `85e4678fde454a80b3445015f9ae6d75`
   - `VITE_SUPABASE_URL` = `https://bukigyhhgrtgryklabjg.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = (sua chave)
4. **Marque:** Production, Preview, Development
5. **Salve** cada uma
6. **Redeploy** o projeto
7. **Teste** em produção

**Pronto!** 🎉

---

## 📞 **Links Úteis:**

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Agora.io Console:** https://console.agora.io/
- **Supabase Dashboard:** https://app.supabase.com

