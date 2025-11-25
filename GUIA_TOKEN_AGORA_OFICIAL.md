# 🔐 Guia Oficial: Configuração de Token Agora.io

Baseado na documentação oficial do Agora.io.

## ❌ **Erro Atual:**
```
invalid token, authorized failed
```

## 📋 **O que significa:**

O token está sendo rejeitado pelo Agora.io. Isso acontece quando:
1. **Token expirado** - Tokens temporários expiram rapidamente
2. **Token gerado para outro channel name** - O token precisa corresponder ao channel usado
3. **Token gerado com role incorreto** - Precisa ser `publisher` para broadcaster ou `subscriber` para viewer
4. **Token gerado para outro App ID** - Token e App ID devem ser do mesmo projeto

---

## ✅ **SOLUÇÃO 1: Gerar Token Corretamente (Recomendado)**

### **Passo a Passo:**

1. **Acesse:** https://console.agora.io/
2. **Vá em:** Projects → Seu projeto
3. **Clique em:** "Gerar token temporário"

4. **Preencha os campos:**
   - **Channel Name:** Use o mesmo nome que será usado na transmissão (ex: `test` ou `live`)
   - **UID:** Deixe vazio ou use `0` (o SDK gera automaticamente)
   - **Role:** 
     - `publisher` ou `1` para **broadcaster** (quem transmite)
     - `subscriber` ou `2` para **viewer** (quem assiste)
   - **Expiration:** 24 horas (ou mais para testes)

5. **Copie o token gerado**

6. **Adicione no `.env`:**
   ```env
   VITE_AGORA_APP_ID=3082f5fa603147ecab11279cce124d6f
   VITE_AGORA_TOKEN=token-gerado-aqui
   ```

7. **Reinicie o servidor:**
   ```bash
   npm run dev
   ```

---

## ✅ **SOLUÇÃO 2: Usar Apenas App ID (Mais Simples para Desenvolvimento)**

### **Passo a Passo:**

1. **Acesse:** https://console.agora.io/
2. **Vá em:** Projects → Seu projeto → **Settings** ou **Edit**
3. **Procure por:** "Authentication" ou "Security Settings"
4. **Mude de:** "Token" para **"App ID Only"** ou **"No Authentication"**
5. **Salve** e aguarde alguns minutos

6. **Remova o token do `.env`:**
   ```env
   VITE_AGORA_APP_ID=3082f5fa603147ecab11279cce124d6f
   # VITE_AGORA_TOKEN=  <- Remova ou comente esta linha
   ```

7. **Reinicie o servidor**

---

## 📚 **Baseado na Documentação Oficial:**

Segundo a documentação oficial do Agora.io:

### **Ordem Correta de Operações:**

```javascript
// 1. Criar cliente
const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });

// 2. Configurar event listeners ANTES de join
setupEventListeners(client);

// 3. Entrar no canal
await client.join(appId, channelName, token, uid);

// 4. Configurar role DEPOIS de join
await client.setClientRole("host"); // ou "audience"
```

### **Para Broadcaster (Host):**
```javascript
await client.join(appId, channelName, token, uid);
await client.setClientRole("host");
// Criar tracks e publicar
```

### **Para Viewer (Audience):**
```javascript
await client.join(appId, channelName, token, uid);
await client.setClientRole("audience", { level: 2 });
// Aguardar user-published event
```

---

## 🔄 **Renovação de Token (Para Produção):**

Para produção, você precisa renovar o token antes de expirar:

```javascript
client.on("token-privilege-will-expire", async function () {
  // Buscar novo token do servidor
  let token = await fetchToken(uid, channelName, role);
  // Renovar token
  await client.renewToken(token);
});
```

---

## ⚠️ **Importante:**

- **Tokens temporários expiram rapidamente** - Use apenas para testes
- **Para produção:** Crie um servidor de tokens que gere tokens dinamicamente
- **App ID Only:** Funciona apenas para desenvolvimento/testes
- **Token + App ID:** Devem ser do mesmo projeto

---

## 🆘 **Ainda com Problemas?**

1. Verifique se o App ID está correto
2. Verifique se o token foi gerado para o mesmo App ID
3. Verifique se o token não expirou
4. Tente gerar um novo token
5. Ou configure para usar apenas App ID

