# ⚡ Solução Rápida: Erro CAN_NOT_GET_GATEWAY_SERVER

## 🚨 **Erro Atual:**
```
AgoraRTCError CAN_NOT_GET_GATEWAY_SERVER: unknown error
```

## ✅ **AÇÕES IMEDIATAS (Faça nesta ordem):**

### **1️⃣ Verificar se o App ID está configurado:**

Abra o arquivo `.env` na raiz do projeto e verifique se contém:

```env
VITE_AGORA_APP_ID=1e4cb25acbd349c6a540d0c0e1b13931
```

**Se não tiver:**
- Crie o arquivo `.env` na raiz do projeto
- Copie o conteúdo do `env.example.txt`
- Adicione a linha acima

### **2️⃣ Reiniciar o servidor:**

```bash
# Pare o servidor (Ctrl+C)
npm run dev
```

**IMPORTANTE:** O Vite só carrega variáveis do `.env` quando o servidor inicia!

### **3️⃣ Verificar no Console do Navegador:**

1. Abra o console (F12)
2. Digite:
   ```javascript
   console.log('App ID:', import.meta.env.VITE_AGORA_APP_ID);
   ```
3. **Se aparecer `undefined`**:
   - O arquivo `.env` não está sendo lido
   - Verifique se está na raiz do projeto
   - Reinicie o servidor novamente

### **4️⃣ Verificar se o projeto existe no Agora.io:**

1. Acesse: https://console.agora.io/
2. Faça login
3. Vá em "Projects"
4. Procure pelo App ID: `1e4cb25acbd349c6a540d0c0e1b13931`

**Se o projeto NÃO existir:**
- O App ID está incorreto
- Você precisa criar um novo projeto ou usar um App ID válido

**Se o projeto existir:**
- Verifique se está **ATIVO**
- Verifique se não há avisos ou notificações

### **5️⃣ Configurar o projeto para "App ID Only":**

1. No dashboard do Agora.io, clique no projeto
2. Vá em "Edit" ou "Settings"
3. Procure por "Authentication" ou "Security"
4. Mude para **"App ID Only"** ou **"No Authentication"**
5. Salve e aguarde 2-3 minutos

### **6️⃣ Testar novamente:**

1. Limpe o cache do navegador (Ctrl+Shift+R)
2. Tente iniciar uma transmissão
3. Verifique o console para erros

---

## 🆘 **Se ainda não funcionar:**

### **Opção A: Criar novo projeto no Agora.io**

1. Acesse: https://console.agora.io/
2. Vá em "Projects" → "Create Project"
3. Nome: "ZK Premios Live"
4. Use Case: "Live Streaming"
5. Authentication: **"App ID Only"**
6. Copie o novo App ID
7. Atualize o `.env`:
   ```env
   VITE_AGORA_APP_ID=novo-app-id-aqui
   ```
8. Reinicie o servidor

### **Opção B: Usar Token Temporário**

1. No dashboard do Agora.io, vá no projeto
2. Gere um token temporário:
   - Channel Name: `ZkPremios` (ou o nome do canal que você usa)
   - Role: `subscriber` (para viewer) ou `publisher` (para broadcaster)
   - Expiration: 24 horas
3. Adicione no `.env`:
   ```env
   VITE_AGORA_APP_ID=1e4cb25acbd349c6a540d0c0e1b13931
   VITE_AGORA_TOKEN=token-gerado-aqui
   ```
4. Reinicie o servidor

---

## 📝 **Checklist Final:**

- [ ] Arquivo `.env` existe na raiz do projeto
- [ ] `VITE_AGORA_APP_ID` está configurado no `.env`
- [ ] Servidor foi reiniciado após adicionar/alterar `.env`
- [ ] App ID aparece no console do navegador (não é `undefined`)
- [ ] Projeto existe no dashboard do Agora.io
- [ ] Projeto está ATIVO no Agora.io
- [ ] Projeto está configurado para "App ID Only" (ou token está configurado)
- [ ] Cache do navegador foi limpo

---

## 🔗 **Links Úteis:**

- **Console Agora.io:** https://console.agora.io/
- **Documentação Agora:** https://docs.agora.io/
- **Guia Completo:** Veja `RESOLVER_ERRO_GATEWAY_AGORA.md`

---

**Última atualização:** App ID atual: `1e4cb25acbd349c6a540d0c0e1b13931`

