# ⚡ Guia Rápido - Configurar Agora.io em 5 Minutos

## 🎯 **O QUE VOCÊ PRECISA FAZER:**

### **1️⃣ Instalar Dependência (Já adicionada ao package.json)**

```bash
npm install
```

---

### **2️⃣ Criar Conta e Obter App ID (5 minutos)**

#### **Passo 1: Criar Conta**
1. Acesse: **https://www.agora.io**
2. Clique em **"Sign Up"** (canto superior direito)
3. Preencha:
   - Email
   - Senha
   - Nome
4. Confirme o email

#### **Passo 2: Criar Projeto**
1. Faça login
2. No dashboard, clique em **"Projects"**
3. Clique em **"Create Project"**
4. Preencha:
   - **Project Name:** ZK Premios Live
   - **Use Case:** Live Streaming
5. Clique em **"Create"**

#### **Passo 3: Copiar App ID**
1. Na página do projeto criado
2. Você verá o **App ID** (exemplo: `a1b2c3d4e5f6g7h8i9j0`)
3. **COPIE ESSE ID**

---

### **3️⃣ Adicionar no .env**

1. Na raiz do projeto, abra ou crie o arquivo `.env`
2. Adicione:

```env
VITE_AGORA_APP_ID=cole-seu-app-id-aqui
```

**Exemplo:**
```env
VITE_AGORA_APP_ID=a1b2c3d4e5f6g7h8i9j0
```

---

### **4️⃣ Reiniciar o Servidor**

```bash
# Pare o servidor (Ctrl+C)
# Depois inicie novamente:
npm run dev
```

---

### **5️⃣ Testar**

1. Acesse: `http://localhost:5173/admin/live-stream`
2. Crie uma transmissão
3. Clique em "Iniciar Transmissão"
4. Permita acesso à câmera/microfone
5. **Se aparecer seu vídeo, está funcionando!** 🎉

---

## ✅ **CHECKLIST:**

- [ ] Conta criada no Agora.io
- [ ] Projeto criado no Agora.io
- [ ] App ID copiado
- [ ] `VITE_AGORA_APP_ID` adicionado no `.env`
- [ ] `npm install` executado
- [ ] Servidor reiniciado
- [ ] Transmissão testada

---

## 🆘 **AJUDA RÁPIDA:**

### **Não consigo criar conta:**
- Use outro email
- Verifique se o email foi confirmado

### **Não encontro o App ID:**
- Vá em **Projects** → Clique no seu projeto → O App ID está no topo

### **Erro ao iniciar transmissão:**
- Verifique se o App ID está correto no `.env`
- Confirme que permitiu acesso à câmera/microfone
- Reinicie o servidor após adicionar o App ID

---

## 🎯 **RESUMO:**

1. ✅ Criar conta: https://www.agora.io
2. ✅ Criar projeto e copiar App ID
3. ✅ Adicionar no `.env`: `VITE_AGORA_APP_ID=seu-id`
4. ✅ Executar: `npm install`
5. ✅ Reiniciar: `npm run dev`
6. ✅ Testar!

**Pronto em 5 minutos!** 🚀

