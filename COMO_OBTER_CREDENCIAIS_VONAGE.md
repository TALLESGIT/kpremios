# Como Obter Credenciais da API Vonage

## 📋 Pré-requisitos
- Conta no Vonage (gratuita)
- Acesso ao Dashboard do Vonage

## 🔑 Passo 1: Criar Conta no Vonage

1. Acesse: https://dashboard.nexmo.com/sign-up
2. Crie sua conta gratuita
3. Confirme seu email
4. Faça login no dashboard

## 🏗️ Passo 2: Criar uma Aplicação

### No Dashboard do Vonage:

1. **Acesse Applications**:
   - No menu lateral, clique em "Applications"
   - Ou vá direto: https://dashboard.nexmo.com/applications

2. **Criar Nova Aplicação**:
   - Clique em "Create a new application"
   - Nome: `ZK Premios WhatsApp`
   - Selecione "Messages" capability

3. **Configurar Messages**:
   - **Inbound URL**: `http://localhost:3001/webhooks/inbound` (para desenvolvimento)
   - **Status URL**: `http://localhost:3001/webhooks/status` (para desenvolvimento)
   - Clique em "Generate new application"

4. **Gerar Par de Chaves** (PASSO CRÍTICO):
   - Após criar a aplicação, você verá a página de detalhes
   - Procure por "Public/Private Keypair" ou "Generate keypair"
   - Clique em "Generate public/private key pair"
   - **ATENÇÃO**: Uma janela popup aparecerá com:
     - Chave pública (na tela)
     - Botão "Download private key" ou "Save private key"
   - **Clique no botão de download IMEDIATAMENTE**
   - O arquivo `private.key` será baixado para sua pasta Downloads
   - **IMPORTANTE**: Esta é sua ÚNICA chance de baixar a chave privada!

## 🔍 Passo 3: ONDE EXATAMENTE BAIXAR A CHAVE PRIVADA

### 📍 Localização no Dashboard:

**Opção 1 - Durante a criação da aplicação:**
1. Após clicar em "Generate new application"
2. Na página de confirmação, procure por "Generate public/private key pair"
3. Clique no botão → Popup aparece → Clique "Download private key"

**Opção 2 - Em aplicação existente:**
1. Dashboard → Applications → [Sua aplicação]
2. Na página da aplicação, procure seção "Authentication"
3. Procure por:
   - "Public/Private Keypair"
   - "Generate keypair" 
   - "Manage keys"
   - Botão "Generate public/private key pair"
4. Clique → Popup → Download

**Opção 3 - Se não encontrar:**
1. Clique em "Edit application" (botão no topo)
2. Role até encontrar seção de chaves/keys
3. Clique "Generate public/private key pair"
4. Download imediato do arquivo

### 🎯 O que procurar:
- Texto: "Public/Private Keypair"
- Botão: "Generate public/private key pair"
- Popup com: "Download private key"
- Arquivo baixado: `private.key` ou `application_name.key`

## 🔍 Passo 4: Encontrar suas Outras Credenciais

### API Key e API Secret:
1. No dashboard, vá para "Getting Started" ou "API Settings"
2. Você verá:
   - **API Key**: Uma string como `abcd1234`
   - **API Secret**: Uma string como `AbCdEfGhIjKlMnOp`

### Application ID:
1. Vá para "Applications"
2. Clique na aplicação que você criou
3. Copie o **Application ID** (algo como `aaaaaaaa-bbbb-cccc-dddd-0123456789ab`)

### Private Key:
1. Use o arquivo `private.key` que você baixou
2. Abra o arquivo e copie todo o conteúdo
3. Deve começar com `-----BEGIN PRIVATE KEY-----`

### Public Key:
1. A chave pública é exibida no dashboard após gerar o par
2. Começa com `-----BEGIN PUBLIC KEY-----`
3. **Nota**: Para WhatsApp, você precisa principalmente da chave PRIVADA

## ⚙️ Passo 4: Configurar no Projeto

### Edite o arquivo `.env`:

```env
# Vonage Configuration (REAL MODE)
VITE_VONAGE_REAL_MODE=false
VITE_VONAGE_API_KEY=sua_api_key_aqui
VITE_VONAGE_API_SECRET=seu_api_secret_aqui
VITE_VONAGE_APPLICATION_ID=seu_application_id_aqui
VITE_VONAGE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
Sua chave privada aqui (múltiplas linhas)
-----END PRIVATE KEY-----"
# Nota: A chave pública fica no dashboard do Vonage, não precisa no .env
```

### ✅ SUAS CREDENCIAIS (baseado no que você mostrou):
```env
VITE_VONAGE_REAL_MODE=false
VITE_VONAGE_API_KEY=1f83881f
VITE_VONAGE_API_SECRET=SEU_API_SECRET_AQUI
VITE_VONAGE_APPLICATION_ID=2ac17003-9897-415e-b1f4-db6b2c059b2c
VITE_VONAGE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
SUA_CHAVE_PRIVADA_AQUI
-----END PRIVATE KEY-----"
```

### 🔍 O que você ainda precisa:
1. **API SECRET**: Encontre no dashboard junto com a API Key
2. **CHAVE PRIVADA**: Siga os passos abaixo ⬇️

## 🧪 Passo 5: Testar a Configuração

1. **Modo Simulação** (recomendado primeiro):
   ```env
   VITE_VONAGE_REAL_MODE=false
   ```

2. **Executar o teste**:
   - Abra a aplicação
   - Teste o envio de mensagem
   - Verifique os logs no console

3. **Modo Real** (após testar simulação):
   ```env
   VITE_VONAGE_REAL_MODE=true
   ```

## 🔒 Segurança

### ⚠️ NUNCA faça:
- Commit das credenciais no Git
- Compartilhe suas chaves
- Use credenciais de produção em desenvolvimento

### ✅ Sempre faça:
- Use `.env` para credenciais
- Mantenha `.env` no `.gitignore`
- Use modo simulação para testes
- Rotacione chaves periodicamente

## 🆘 Problemas Comuns

### ❌ "Não consigo encontrar a chave privada":
**SOLUÇÃO PARA SUA APLICAÇÃO "ZK Premios"**:
1. No dashboard, clique na aplicação "ZK Premios"
2. Você verá "PUBLIC KEY: Added" (como mostrou)
3. Procure por um botão próximo como:
   - "Download private key"
   - "Generate new keypair"
   - "Manage keys"
4. **SE NÃO ENCONTRAR**: Clique "Edit application"
5. Procure seção "Authentication" ou "Keys"
6. Clique "Generate public/private key pair"
7. **BAIXE IMEDIATAMENTE** o arquivo private.key

### ❌ "Perdi a chave privada":
**SOLUÇÃO**:
1. Gere um novo par de chaves na aplicação
2. Baixe o novo arquivo private.key
3. Atualize o .env com a nova chave

### ❌ "Invalid API Key":
- Verifique se copiou corretamente
- Confirme que não há espaços extras
- Teste com credenciais novas

### ❌ "Application not found":
- Verifique o Application ID
- Confirme que a aplicação tem capability "Messages"

### ❌ "Invalid Private Key":
- Verifique se copiou a chave completa
- Inclua as linhas BEGIN/END
- Use aspas duplas no .env

## 📞 Suporte

- **Documentação**: https://developer.vonage.com/
- **Dashboard**: https://dashboard.nexmo.com/
- **Suporte**: https://developer.vonage.com/support

## 🎯 Próximos Passos

1. Configure as credenciais no `.env`
2. Teste no modo simulação
3. Configure webhooks para produção
4. Implemente tratamento de status
5. Configure número WhatsApp Business

---

**Lembre-se**: Comece sempre com o modo simulação (`VITE_VONAGE_REAL_MODE=false`) para testar sua integração antes de usar credenciais reais!