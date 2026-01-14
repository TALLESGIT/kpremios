# 🔧 Troubleshooting: "Instância não conectada"

## ❌ Erro

```json
{
  "success": false,
  "error": "Instância não conectada"
}
```

---

## 🔍 Diagnóstico

Este erro significa que a instância `ZkOficial` existe na Evolution API, mas **não está conectada ao WhatsApp**.

### Status Possíveis:
- `connecting` - Aguardando escanear QR Code
- `close` - Desconectada (precisa conectar)
- `open` - ✅ Conectada e pronta para usar

---

## ✅ Solução Passo a Passo

### 1. Verificar se a Instância Existe

**Via Manager (Interface Web):**
1. Acesse: `http://seu-servidor:3000` (ou a URL do seu Manager)
2. Procure pela instância `ZkOficial`
3. Verifique o status exibido

**Via API:**
```bash
curl -X GET http://seu-servidor:8080/instance/fetchInstances \
  -H "apikey: 261387f8444ef4334c3fc994cf7bde037e9319c0accf0e31deee705b20b80628"
```

---

### 2. Conectar a Instância

#### Opção A: Via Manager (Mais Fácil)

1. Acesse o Manager: `http://seu-servidor:3000`
2. Localize a instância `ZkOficial`
3. Clique no botão **"Conectar"** ou **"Connect"**
4. Um QR Code será exibido
5. Abra o WhatsApp no celular:
   - Vá em **Configurações** → **Aparelhos conectados** → **Conectar um aparelho**
   - Escaneie o QR Code exibido no Manager
6. Aguarde alguns segundos até o status mudar para **"open"** (conectado)

#### Opção B: Via API

```bash
curl -X GET http://seu-servidor:8080/instance/connect/ZkOficial \
  -H "apikey: 261387f8444ef4334c3fc994cf7bde037e9319c0accf0e31deee705b20b80628"
```

Isso retornará um QR Code em base64. Você pode:
- Exibir a imagem do QR Code
- Escanear com o WhatsApp

---

### 3. Verificar Status Após Conectar

**Via Manager:**
- O status deve mudar de `connecting` para `open`

**Via API:**
```bash
curl -X GET http://seu-servidor:8080/instance/connectionState/ZkOficial \
  -H "apikey: 261387f8444ef4334c3fc994cf7bde037e9319c0accf0e31deee705b20b80628"
```

**Resposta esperada:**
```json
{
  "instance": {
    "state": "open"
  }
}
```

---

### 4. Testar Novamente

1. No modal de teste do WhatsApp (Dashboard Admin)
2. Clique no botão **🔄** para atualizar o status
3. O status deve mostrar: **✅ Conectada**
4. Tente enviar uma mensagem de teste novamente

---

## 🚨 Problemas Comuns

### Problema 1: QR Code não aparece

**Solução:**
- Verifique se a Evolution API está rodando: `docker ps`
- Verifique os logs: `docker logs evolution_api`
- Tente criar a instância novamente se ela não existir

### Problema 2: QR Code expira rapidamente

**Solução:**
- QR Codes expiram em ~20 segundos
- Clique em "Conectar" novamente para gerar um novo QR Code
- Tenha o WhatsApp aberto e pronto antes de gerar o QR Code

### Problema 3: Status fica em "connecting" indefinidamente

**Solução:**
1. Verifique se escaneou o QR Code corretamente
2. Verifique se o WhatsApp está conectado à internet
3. Tente desconectar e conectar novamente
4. Reinicie a instância se necessário

### Problema 4: Instância não existe

**Solução:**
Crie a instância via API:
```bash
curl -X POST http://seu-servidor:8080/instance/create \
  -H "apikey: 261387f8444ef4334c3fc994cf7bde037e9319c0accf0e31deee705b20b80628" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "ZkOficial",
    "qrcode": true
  }'
```

---

## 📋 Checklist de Verificação

- [ ] Evolution API está rodando no servidor
- [ ] Instância `ZkOficial` existe
- [ ] QR Code foi escaneado com sucesso
- [ ] Status da instância é `open` (conectada)
- [ ] `.env` do frontend tem `VITE_EVOLUTION_INSTANCE_NAME=ZkOficial`
- [ ] API Key está configurada corretamente
- [ ] URL da Evolution API está acessível

---

## 🔗 Links Úteis

- **Manager:** `http://seu-servidor:3000`
- **API Docs:** `http://seu-servidor:8080/docs`
- **Documentação:** `CONFIGURACAO_EVOLUTION_API_EXTERNA.md`

---

## 💡 Dica

Se a instância ficar desconectada frequentemente:
- Verifique a conexão de internet do servidor
- Verifique se o WhatsApp Web não foi desconectado manualmente
- Configure reconexão automática na Evolution API

---

**Status:** ✅ Guia de troubleshooting criado!

