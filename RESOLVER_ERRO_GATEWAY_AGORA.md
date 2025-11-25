# 🔧 Como Resolver Erro: CAN_NOT_GET_GATEWAY_SERVER

## ❌ **Erro que você está vendo:**

```
AgoraRTCError CAN_NOT_GET_GATEWAY_SERVER: dynamic use static key
```

## 🎯 **O que significa:**

O projeto no Agora.io está configurado para usar **token dinâmico**, mas você está tentando usar apenas o **App ID** (sem token).

---

## ✅ **SOLUÇÃO 1: Gerar Token Temporário (Mais Rápido)**

### **Passo a Passo:**

1. **Acesse o Dashboard do Agora.io:**
   - Vá em: https://console.agora.io/
   - Faça login

2. **Vá em "Projects" → Selecione seu projeto**

3. **Clique em "Edit" (ou configurações do projeto)**

4. **Procure por "Authentication" ou "Security"**

5. **Gere um Token Temporário:**
   - Procure por "Generate Temp Token" ou "Temporary Token"
   - Ou use a ferramenta de geração de token
   - **Channel Name:** Use qualquer nome (ex: `test`)
   - **UID:** Deixe vazio ou use `0`
   - **Role:** `publisher` (para broadcaster) ou `subscriber` (para viewer)
   - **Expiration:** 24 horas (para testes)

6. **Copie o Token gerado**

7. **Adicione no `.env`:**
   ```env
   VITE_AGORA_APP_ID=1515b93d1aab4fb5ae15c91e9557585d
   VITE_AGORA_TOKEN=cole-o-token-gerado-aqui
   ```

8. **Reinicie o servidor:**
   ```bash
   # Pare o servidor (Ctrl+C)
   npm run dev
   ```

---

## ✅ **SOLUÇÃO 2: Configurar Projeto para App ID Apenas (Recomendado para Desenvolvimento)**

### **Passo a Passo:**

1. **Acesse o Dashboard do Agora.io:**
   - Vá em: https://console.agora.io/
   - Faça login

2. **Vá em "Projects" → Selecione seu projeto**

3. **Clique em "Edit" ou "Settings"**

4. **Procure por "Authentication" ou "Security Settings"**

5. **Altere a configuração:**
   - Procure por "Token" ou "Authentication Mode"
   - Mude de **"Token"** para **"App ID Only"** ou **"No Authentication"**
   - Salve as alterações

6. **Aguarde alguns minutos** para as mudanças serem aplicadas

7. **Teste novamente** sem precisar de token

---

## 🆘 **Não encontrou essas opções?**

### **Alternativa: Criar Novo Projeto com App ID Apenas**

1. **Crie um novo projeto:**
   - Vá em "Projects" → "Create Project"
   - Nome: "ZK Premios Live Dev"
   - **Use Case:** Live Streaming
   - **Authentication:** Selecione "App ID Only" ou "No Authentication"

2. **Copie o novo App ID**

3. **Atualize o `.env`:**
   ```env
   VITE_AGORA_APP_ID=novo-app-id-aqui
   # Não precisa de VITE_AGORA_TOKEN para este projeto
   ```

4. **Reinicie o servidor**

---

## 📝 **Verificar se está funcionando:**

1. Abra o console do navegador (F12)
2. Tente iniciar uma transmissão
3. **Se não aparecer mais o erro `CAN_NOT_GET_GATEWAY_SERVER`, está resolvido!** ✅

---

## 💡 **Dica:**

Para **produção**, você sempre precisará usar tokens. Mas para **desenvolvimento/testes**, usar apenas App ID é mais simples.

---

## ✅ **Depois de resolver:**

Teste novamente:
1. Acesse `/admin/live-stream`
2. Crie uma transmissão
3. Clique em "Iniciar Transmissão"
4. O vídeo deve aparecer! 🎉

