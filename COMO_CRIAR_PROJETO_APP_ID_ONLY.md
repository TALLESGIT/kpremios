# 🆕 Como Criar Projeto Agora.io com App ID Only

## 🎯 **Objetivo:**
Criar um novo projeto que funcione apenas com App ID (sem token), ideal para desenvolvimento e testes.

---

## 📋 **Passo a Passo:**

### **1️⃣ Criar Novo Projeto**

1. **Acesse:** https://console.agora.io/
2. **Clique em:** "Projects" no menu lateral
3. **Clique em:** "Create Project" (Criar Projeto)

### **2️⃣ Preencher Informações do Projeto**

Quando a janela de criação aparecer, preencha:

- **Project Name:** `ZK Premios Live Dev` (ou qualquer nome)
- **Use Case:** Selecione **"Live Streaming"** ou **"Video Call"**
- **Authentication:** ⚠️ **IMPORTANTE:** Selecione **"APP ID"** (não selecione "APP ID + Token")

### **3️⃣ Criar o Projeto**

1. Clique em **"Create"** ou **"Criar"**
2. Aguarde alguns segundos
3. O projeto será criado

### **4️⃣ Copiar o Novo App ID**

1. Na página do projeto criado
2. Você verá o **App ID** (exemplo: `a1b2c3d4e5f6g7h8i9j0`)
3. **COPIE ESSE ID**

### **5️⃣ Atualizar o .env**

1. Abra o arquivo `.env` na raiz do projeto
2. Substitua o App ID antigo pelo novo:
   ```env
   VITE_AGORA_APP_ID=novo-app-id-aqui
   # VITE_AGORA_TOKEN=  <- Remova ou comente esta linha
   ```

3. **Remova ou comente** a linha do token (não é necessária)

### **6️⃣ Reiniciar o Servidor**

```bash
# Pare o servidor (Ctrl+C)
npm run dev
```

---

## ✅ **Vantagens:**

- ✅ **Não precisa de token** - Funciona apenas com App ID
- ✅ **Funciona com qualquer channel name** - Não precisa gerar token para cada canal
- ✅ **Mais simples para desenvolvimento** - Menos configuração
- ✅ **Ideal para testes** - Sem preocupação com expiração de token

---

## ⚠️ **Importante:**

- **Para desenvolvimento/testes:** App ID Only é perfeito
- **Para produção:** Você precisará usar tokens para segurança
- **Este projeto:** Use apenas para desenvolvimento

---

## 🔄 **Depois de Criar:**

1. Teste a transmissão - deve funcionar sem token!
2. O erro "invalid token" não deve mais aparecer
3. Você pode usar o projeto antigo para produção depois

---

## 🆘 **Não consegue criar projeto?**

- Verifique se sua conta está ativa
- Tente usar outro nome para o projeto
- Certifique-se de selecionar "APP ID" (não "APP ID + Token") na criação

