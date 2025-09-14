# 📱 Configuração do WhatsApp para ZK Premios

Este guia explica como configurar as notificações WhatsApp usando o Twilio.

## 🚀 Passo 1: Criar conta no Twilio

1. Acesse: https://www.twilio.com/
2. Crie uma conta gratuita
3. Verifique seu número de telefone
4. Acesse o Console do Twilio

## 🔑 Passo 2: Obter credenciais

No Console do Twilio:

1. **Account SID**: Encontre em "Account Info" → "Account SID"
2. **Auth Token**: Clique em "Show" ao lado do Auth Token
3. **WhatsApp Number**: Vá em "Phone Numbers" → "Manage" → "Active numbers"

## 📱 Passo 3: Configurar WhatsApp Sandbox

Para testes (gratuito):

1. Acesse: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
2. Escaneie o QR Code com seu WhatsApp
3. Envie a mensagem de confirmação
4. Use o número do sandbox: `whatsapp:+14155238886`

## ⚙️ Passo 4: Configurar no projeto

Edite o arquivo `.env`:

```env
# WhatsApp/Twilio Configuration
VITE_TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_TWILIO_AUTH_TOKEN=seu_auth_token_aqui
VITE_TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
VITE_APP_URL=http://localhost:5173
```

## 🎯 Funcionalidades implementadas

### 1. **Confirmação de Cadastro**
- Enviado automaticamente quando usuário se registra
- Inclui código de confirmação
- Link direto para o app

### 2. **Notificação de Números**
- Enviado quando números são atribuídos
- Lista os números selecionados
- Link para visualizar números

### 3. **Aprovação de Números Extras**
- Enviado quando admin aprova solicitação
- Inclui números aprovados e valor pago
- Confirmação de pagamento

### 4. **Novos Sorteios**
- Notifica todos os usuários sobre novos sorteios
- Enviado pelo painel administrativo
- Inclui detalhes do prêmio e período

### 5. **Anúncio de Ganhadores**
- Notifica resultado do sorteio
- Diferencia mensagem para ganhador/perdedor
- Link para ver resultado completo

## 🛠️ Como usar

### Para Administradores:

1. **Enviar notificação de novo sorteio:**
   ```javascript
   await notifyAllUsersAboutNewRaffle({
     title: "Sorteio iPhone 15 Pro Max",
     prize: "iPhone 15 Pro Max 256GB",
     startDate: "2025-01-01",
     endDate: "2025-01-31"
   });
   ```

2. **Notificar aprovação de números extras:**
   ```javascript
   await notifyExtraNumbersApproved("request-id-here");
   ```

### Para Desenvolvedores:

```javascript
import { useWhatsApp } from './hooks/useWhatsApp';

const { sendRegistrationConfirmation, loading, error } = useWhatsApp();

// Enviar confirmação de cadastro
await sendRegistrationConfirmation({
  name: "João Silva",
  email: "joao@email.com",
  whatsapp: "+5511999999999",
  confirmationCode: "123456"
});
```

## 📊 Logs e Monitoramento

Todas as notificações são logadas na tabela `notification_logs`:

- **Status**: sent, failed, pending
- **Message SID**: ID da mensagem no Twilio
- **Error Message**: Detalhes do erro (se houver)
- **Timestamp**: Data/hora do envio

## 💰 Custos

### Sandbox (Teste):
- **Gratuito** para testes
- Limitado a números verificados

### Produção:
- **$0.005 por mensagem** (aproximadamente R$ 0,025)
- Sem limite de usuários
- Mensagens ilimitadas

## 🔧 Troubleshooting

### Erro: "WhatsApp service not configured"
- Verifique se as variáveis estão no `.env`
- Reinicie o servidor após alterar `.env`

### Erro: "Failed to send message"
- Verifique se o número está no formato correto
- Confirme se o WhatsApp está configurado no Twilio
- Verifique os logs no Console do Twilio

### Mensagens não chegam:
- Verifique se o número está no sandbox
- Confirme se o usuário enviou a mensagem de confirmação
- Verifique os logs de erro

## 🚀 Produção

Para usar em produção:

1. **Upgrade da conta Twilio** (remover limitações do sandbox)
2. **Configurar número WhatsApp Business** oficial
3. **Atualizar variáveis de ambiente** com credenciais de produção
4. **Configurar webhook** para receber status de entrega

## 📞 Suporte

- **Twilio Docs**: https://www.twilio.com/docs/whatsapp
- **WhatsApp Business API**: https://developers.facebook.com/docs/whatsapp/
- **Logs**: Console do Twilio → Monitor → Logs
