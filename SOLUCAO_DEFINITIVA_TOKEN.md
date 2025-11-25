# 🔧 Solução Definitiva: Erro "invalid token, authorized failed"

## ❌ **Problema:**
O token continua sendo rejeitado mesmo após gerar um novo.

## 🎯 **Causa Raiz:**
O token do Agora.io precisa ser gerado **especificamente para o channel name** que será usado. Como estamos gerando channel names dinâmicos (ex: `stream_1764080338587_vt2j4byy2`), o token gerado no dashboard não funciona porque foi gerado para outro channel name.

---

## ✅ **SOLUÇÃO DEFINITIVA: Configurar para App ID Only**

Esta é a solução mais simples para desenvolvimento e testes.

### **Passo a Passo:**

1. **Acesse:** https://console.agora.io/
2. **Faça login**
3. **Vá em:** Projects → Selecione seu projeto (`3082f5fa603147ecab11279cce124d6f`)
4. **Clique em:** "Edit" ou "Settings" (Configurações)
5. **Procure por:** "Authentication" ou "Security" ou "Token"
6. **Mude de:** "Token" ou "Secure Mode" para **"App ID Only"** ou **"No Authentication"**
7. **Salve** as alterações
8. **Aguarde 2-3 minutos** para as mudanças serem aplicadas

### **Depois de Configurar:**

1. **Remova ou comente o token no `.env`:**
   ```env
   VITE_AGORA_APP_ID=3082f5fa603147ecab11279cce124d6f
   # VITE_AGORA_TOKEN=  <- Comente ou remova esta linha
   ```

2. **Reinicie o servidor:**
   ```bash
   npm run dev
   ```

3. **Teste novamente** - deve funcionar sem token!

---

## 🔄 **Alternativa: Gerar Token Dinamicamente (Para Produção)**

Para produção, você precisará criar um servidor que gere tokens dinamicamente para cada channel name. Mas para desenvolvimento/testes, usar "App ID Only" é muito mais simples.

---

## 📝 **Por que isso funciona:**

- **App ID Only:** Não requer token, funciona com qualquer channel name
- **Token:** Requer que o token seja gerado para o channel name específico
- **Para desenvolvimento:** App ID Only é perfeito
- **Para produção:** Você precisará de um servidor de tokens

---

## ✅ **Depois de Configurar:**

1. O erro "invalid token" não deve mais aparecer
2. A transmissão deve funcionar normalmente
3. Não precisará gerar tokens manualmente

---

## 🆘 **Não encontrou a opção "App ID Only"?**

Alguns projetos podem ter essa opção em locais diferentes:
- **Settings** → **Authentication**
- **Security** → **Token Settings**
- **Project Settings** → **Authentication Mode**

Se não encontrar, tente criar um **novo projeto** e selecione "App ID Only" na criação.

