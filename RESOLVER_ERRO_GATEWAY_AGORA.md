# 🔧 Como Resolver Erro: CAN_NOT_GET_GATEWAY_SERVER

## ❌ **Erro que você está vendo:**

```
AgoraRTCError CAN_NOT_GET_GATEWAY_SERVER: no active status
```

ou

```
AgoraRTCError CAN_NOT_GET_GATEWAY_SERVER: dynamic use static key
```

ou

```
AgoraRTCError CAN_NOT_GET_GATEWAY_SERVER: unknown error
```

## 🎯 **O que significa:**

### **Erro "no active status":**
O projeto no Agora.io está **inativo, suspenso ou desabilitado**. Isso pode acontecer quando:
- A conta do Agora.io está com problemas
- O projeto foi desabilitado manualmente
- A conta atingiu limites de uso
- Há problemas de pagamento (se for conta paga)

### **Erro "dynamic use static key":**
O projeto está configurado para usar **token dinâmico**, mas você está tentando usar apenas o **App ID** (sem token).

### **Erro "unknown error":**
Geralmente indica que:
- O **App ID está incorreto ou inválido**
- O projeto não existe ou foi deletado
- Há problemas de conectividade com os servidores do Agora.io
- O App ID não está sendo carregado corretamente do `.env`

---

## 🔍 **DIAGNÓSTICO RÁPIDO (Para erro "unknown error"):**

Antes de tentar outras soluções, verifique:

### **1. Verificar se o App ID está no `.env`:**
```bash
# No terminal, verifique se o arquivo .env existe e contém:
VITE_AGORA_APP_ID=1e4cb25acbd349c6a540d0c0e1b13931
```

### **2. Verificar se o App ID está sendo carregado:**
1. Abra o console do navegador (F12)
2. No console, digite:
   ```javascript
   console.log('App ID:', import.meta.env.VITE_AGORA_APP_ID);
   ```
3. **Se aparecer `undefined`**, o App ID não está sendo carregado. Soluções:
   - Certifique-se de que o arquivo `.env` está na raiz do projeto
   - Reinicie o servidor de desenvolvimento (`npm run dev`)
   - Limpe o cache do navegador (Ctrl+Shift+R)

### **3. Verificar se o App ID está correto:**
1. Acesse: https://console.agora.io/
2. Faça login
3. Vá em "Projects" → Procure pelo projeto com App ID: `1e4cb25acbd349c6a540d0c0e1b13931`
4. **Se o projeto não existir**, você precisa:
   - Criar um novo projeto
   - Ou usar o App ID de um projeto existente

### **4. Verificar status do projeto no Agora.io:**
- O projeto deve estar **ATIVO**
- Não deve estar suspenso ou desabilitado
- Verifique se há avisos ou notificações no dashboard

---

## 🚨 **SOLUÇÃO PRIORITÁRIA: Verificar Status do Projeto (Para erro "no active status")**

### **Passo a Passo:**

1. **Acesse o Dashboard do Agora.io:**
   - Vá em: https://console.agora.io/
   - Faça login

2. **Vá em "Projects" → Selecione seu projeto**

3. **Verifique o Status do Projeto:**
   - Procure por indicadores de status (Ativo, Inativo, Suspenso)
   - Verifique se há avisos ou notificações

4. **Se o projeto estiver SUSPENSO ou INATIVO:**
   - Clique em "Edit" ou "Settings"
   - Procure por "Reactivate" ou "Enable Project"
   - Siga as instruções para reativar

5. **Verifique a Conta:**
   - Vá em "Account" ou "Billing"
   - Verifique se há problemas de pagamento ou limites atingidos
   - Se necessário, entre em contato com o suporte do Agora.io

6. **Se não conseguir reativar:**
   - Crie um novo projeto (veja SOLUÇÃO 3 abaixo)
   - Use o novo App ID no arquivo `.env`

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
   VITE_AGORA_APP_ID=1e4cb25acbd349c6a540d0c0e1b13931
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
   VITE_AGORA_APP_ID=1e4cb25acbd349c6a540d0c0e1b13931
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

