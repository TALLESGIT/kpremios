# 🎯 Como Obter o App ID do Agora.io - Passo a Passo

## 📍 **ONDE CONSEGUIR O APP ID:**

### **Passo 1: Acessar o Site**

1. Abra seu navegador
2. Acesse: **https://www.agora.io**
3. Clique em **"Sign Up"** (canto superior direito) se não tiver conta
   - OU clique em **"Sign In"** se já tiver conta

---

### **Passo 2: Criar Conta (Se Não Tiver)**

1. Preencha o formulário:
   - **Email:** seu email
   - **Password:** sua senha
   - **Company Name:** (opcional) ZK Premios
2. Clique em **"Sign Up"**
3. **Confirme seu email** (verifique a caixa de entrada)

---

### **Passo 3: Fazer Login**

1. Acesse: **https://www.agora.io**
2. Clique em **"Sign In"**
3. Digite email e senha
4. Clique em **"Sign In"**

---

### **Passo 4: Criar Projeto**

1. Após fazer login, você verá o **Dashboard**
2. No menu superior, clique em **"Projects"** ou **"Console"**
3. Clique no botão **"+ Create"** ou **"Create Project"**
4. Preencha:
   - **Project Name:** `ZK Premios Live` (ou qualquer nome)
   - **Use Case:** Selecione **"Live Streaming"** ou **"Video"**
5. Clique em **"Submit"** ou **"Create"**

---

### **Passo 5: Copiar o App ID** ⭐

1. Após criar o projeto, você será redirecionado para a página do projeto
2. **O App ID aparece logo no topo da página**, em uma caixa destacada
3. Você verá algo assim:

```
┌─────────────────────────────────────┐
│  Project: ZK Premios Live          │
│                                     │
│  App ID: a1b2c3d4e5f6g7h8i9j0     │ ← ESTE É O SEU APP ID!
│  [Copy]                             │
└─────────────────────────────────────┘
```

4. Clique no botão **"Copy"** ao lado do App ID
   - OU selecione e copie manualmente

---

### **Passo 6: Adicionar no .env**

1. Abra o arquivo `.env` na raiz do seu projeto
2. Adicione ou edite a linha:

```env
VITE_AGORA_APP_ID=a1b2c3d4e5f6g7h8i9j0
```

**Substitua** `a1b2c3d4e5f6g7h8i9j0` pelo App ID que você copiou!

---

## 📸 **Onde Fica o App ID (Visual):**

```
┌─────────────────────────────────────────────────────────┐
│  Agora.io Dashboard                                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Projects > ZK Premios Live                             │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Project Information                            │   │
│  │                                                 │   │
│  │  App ID: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6      │ ← AQUI!
│  │  [📋 Copy]                                      │   │
│  │                                                 │   │
│  │  App Certificate: (opcional)                   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ **CHECKLIST:**

- [ ] Conta criada no Agora.io
- [ ] Email confirmado
- [ ] Login realizado
- [ ] Projeto criado
- [ ] App ID copiado
- [ ] App ID adicionado no `.env`
- [ ] Servidor reiniciado (`npm run dev`)

---

## 🆘 **PROBLEMAS COMUNS:**

### **"Não consigo criar conta"**
- Tente com outro email
- Verifique se o email foi confirmado
- Use um email válido

### **"Não encontro o App ID"**
- Certifique-se de estar na página do projeto criado
- Procure por "App ID" ou "Application ID"
- O App ID geralmente tem 32 caracteres

### **"O App ID não funciona"**
- Verifique se copiou completo (sem espaços)
- Confirme que adicionou no `.env` corretamente
- Reinicie o servidor após adicionar

---

## 🎯 **RESUMO RÁPIDO:**

1. **Acesse:** https://www.agora.io
2. **Crie conta** (se não tiver)
3. **Faça login**
4. **Crie projeto** → "Projects" → "+ Create"
5. **Copie App ID** (aparece no topo do projeto)
6. **Cole no `.env`:** `VITE_AGORA_APP_ID=seu-id-aqui`
7. **Reinicie:** `npm run dev`

**Pronto!** 🎉

---

## 📞 **AJUDA ADICIONAL:**

Se tiver dúvidas:
- **Documentação Agora:** https://docs.agora.io
- **Suporte:** https://www.agora.io/en/support

