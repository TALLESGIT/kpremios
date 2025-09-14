# 🧪 Guia de Configuração do Sandbox WhatsApp

## ⚠️ **Problema Identificado**

As mensagens estão sendo enviadas para o Twilio, mas não chegam ao seu WhatsApp porque o **sandbox não está configurado**.

## 🔧 **Solução Passo a Passo**

### **Passo 1: Acesse o Sandbox**
1. **Abra**: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
2. **Procure por**: "Connect to sandbox" ou "Conectar ao sandbox"

### **Passo 2: Configure o Sandbox**
1. **Escaneie o QR Code** com seu WhatsApp
2. **Envie a mensagem** que aparece (algo como `join <código>`)
3. **Aguarde confirmação** de que está conectado

### **Passo 3: Verifique a Configuração**
- ✅ **Status**: "Connected" ou "Conectado"
- ✅ **Seu número**: `+5533999030124` deve aparecer listado
- ✅ **Número do sandbox**: `+14155238886`

### **Passo 4: Teste no Sistema**
1. **Acesse**: http://localhost:5173/admin
2. **Clique em**: "🧪 Teste Sandbox"
3. **Use seu número**: `+5533999030124`
4. **Envie uma mensagem de teste**

## 📱 **Como Escanear o QR Code**

### **No WhatsApp:**
1. **Abra o WhatsApp** no seu celular
2. **Toque nos 3 pontos** (menu)
3. **Vá em**: "Dispositivos conectados"
4. **Toque em**: "Conectar um dispositivo"
5. **Escaneie o QR Code** da página do Twilio

### **Mensagem de Confirmação:**
Após escanear, você deve enviar uma mensagem como:
```
join <código-do-sandbox>
```

## ✅ **Verificação de Sucesso**

### **Se funcionou:**
- ✅ Mensagem enviada com sucesso
- ✅ Mensagem recebida no seu WhatsApp
- ✅ Remetente: `+14155238886`

### **Se não funcionou:**
- ❌ Verifique se escaneou o QR Code
- ❌ Verifique se enviou a mensagem de confirmação
- ❌ Verifique se o status está "Connected"

## 🔍 **Troubleshooting**

### **Problema: QR Code não aparece**
- **Solução**: Recarregue a página do Twilio

### **Problema: WhatsApp não reconhece o QR Code**
- **Solução**: Certifique-se de estar na seção "Dispositivos conectados"

### **Problema: Mensagem de confirmação não funciona**
- **Solução**: Use exatamente o texto mostrado na tela

### **Problema: Ainda não recebe mensagens**
- **Solução**: Verifique se o status está "Connected" no Twilio

## 📞 **Números Importantes**

- **Seu número**: `+5533999030124`
- **Sandbox**: `+14155238886`
- **Account SID**: `[CONFIGURADO]`

## 🚀 **Próximos Passos**

Após configurar o sandbox:
1. **Teste o sistema** com o painel admin
2. **Verifique se as mensagens chegam**
3. **Configure notificações automáticas**
4. **Teste com usuários reais**

---

**💡 Dica**: O sandbox é apenas para testes. Para produção, você precisará aprovar um número de WhatsApp Business.
