# 🎥 Como Configurar Agora.io para Live Streaming

## 📋 **Status Atual:**

✅ **SDK instalado** - `agora-rtc-sdk-ng` adicionado ao `package.json`  
✅ **Componente preparado** - `VideoStream.tsx` com integração completa  
✅ **Configuração no .env** - Variáveis adicionadas ao `env.example.txt`  

---

## 🚀 **Passo a Passo para Configurar:**

### **1️⃣ Instalar Dependência**

```bash
npm install
```

Isso instalará o `agora-rtc-sdk-ng` automaticamente.

---

### **2️⃣ Criar Conta no Agora.io**

1. Acesse: https://www.agora.io
2. Clique em **"Sign Up"** (Cadastrar)
3. Preencha seus dados
4. Confirme o email

---

### **3️⃣ Criar Projeto**

1. Faça login no dashboard
2. Vá em **"Projects"** → **"Create Project"**
3. Escolha um nome (ex: "ZK Premios Live")
4. Copie o **App ID** gerado

---

### **4️⃣ Configurar no Projeto**

1. Crie/edite o arquivo `.env` na raiz do projeto
2. Adicione:

```env
VITE_AGORA_APP_ID=1e4cb25acbd349c6a540d0c0e1b13931
VITE_AGORA_TOKEN=seu-token-aqui
```

**App ID Configurado:** `1e4cb25acbd349c6a540d0c0e1b13931`

**Nota:** Para desenvolvimento/testes, você pode usar apenas o `APP_ID`. O `TOKEN` é necessário apenas para produção.

---

### **5️⃣ Obter Token (Opcional - Para Produção)**

Para produção, você precisa gerar tokens. Existem duas opções:

#### **Opção A: Token Server (Recomendado)**

Crie um endpoint no seu backend que gere tokens:

```javascript
// Exemplo de endpoint para gerar token
app.post('/api/agora/token', async (req, res) => {
  const { channelName, uid } = req.body;
  const token = generateToken(APP_ID, channelName, uid);
  res.json({ token });
});
```

#### **Opção B: Token Temporário (Desenvolvimento)**

No dashboard do Agora, você pode gerar tokens temporários para testes.

---

## ✅ **Verificar se Está Funcionando:**

1. **App ID já configurado:** `1e4cb25acbd349c6a540d0c0e1b13931`
2. Adicione no arquivo `.env`:
   ```env
   VITE_AGORA_APP_ID=1e4cb25acbd349c6a540d0c0e1b13931
   ```
3. Reinicie o servidor (`npm run dev`)
4. Acesse `/admin/live-stream`
5. Crie uma transmissão
6. Clique em "Iniciar Transmissão"
7. Se aparecer o vídeo, está funcionando! 🎉

---

## 🆘 **Problemas Comuns:**

### **"Agora.io App ID não configurado"**

**Solução:** Adicione `VITE_AGORA_APP_ID` no arquivo `.env`

### **"Erro ao iniciar transmissão"**

**Possíveis causas:**
- Permissões de câmera/microfone negadas
- App ID incorreto
- Problema de conexão

**Solução:**
1. Verifique se permitiu acesso à câmera/microfone
2. Confirme se o App ID está correto
3. Teste em outro navegador

### **"Erro ao conectar à transmissão"**

**Solução:**
- Verifique se o broadcaster está transmitindo
- Confirme se o App ID está correto
- Verifique a conexão de internet

---

## 📚 **Documentação:**

- **Agora.io Docs:** https://docs.agora.io
- **SDK JavaScript:** https://docs.agora.io/en/video-calling/get-started/get-started-sdk

---

## 🎯 **Resumo:**

1. ✅ Instalar: `npm install`
2. ✅ Criar conta no Agora.io
3. ✅ Criar projeto e copiar App ID
4. ✅ Adicionar `VITE_AGORA_APP_ID` no `.env`
5. ✅ Testar a transmissão

**Pronto!** 🎉

