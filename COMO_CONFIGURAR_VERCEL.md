# 🚀 Como Configurar suas Credenciais na Vercel

## Passo a Passo Detalhado

### 1️⃣ Obter suas Credenciais do Supabase

1. Acesse [supabase.com](https://supabase.com) e faça login
2. Selecione seu projeto `kpremios`
3. Vá em **Settings** → **API**
4. Copie:
   - **Project URL** (exemplo: `https://bukigyhhgrtgryklabjg.supabase.co`)
   - **anon/public key** (a chave longa que começa com `eyJ...`)

### 2️⃣ Configurar na Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login
2. Selecione seu projeto `kpremios`
3. Vá em **Settings** → **Environment Variables**
4. Clique em **Add New**

### 3️⃣ Adicionar as Variáveis (OBRIGATÓRIAS)

#### Variável 1: URL do Supabase
- **Name**: `VITE_SUPABASE_URL`
- **Value**: Cole sua URL do Supabase (ex: `https://bukigyhhgrtgryklabjg.supabase.co`)
- **Environments**: Marque ✅ Production, ✅ Preview, ✅ Development
- Clique **Save**

#### Variável 2: Chave Anônima do Supabase
- **Name**: `VITE_SUPABASE_ANON_KEY`
- **Value**: Cole sua chave anônima (ex: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)
- **Environments**: Marque ✅ Production, ✅ Preview, ✅ Development
- Clique **Save**

### 4️⃣ Variáveis do Vonage (OPCIONAIS - só se usar WhatsApp)

Se você configurou o WhatsApp, adicione também:

#### VITE_VONAGE_REAL_MODE
- **Name**: `VITE_VONAGE_REAL_MODE`
- **Value**: `true`
- **Environments**: ✅ Production, ✅ Preview, ✅ Development

#### VITE_VONAGE_API_KEY
- **Name**: `VITE_VONAGE_API_KEY`
- **Value**: Sua API Key do Vonage (ex: `1f83881f`)
- **Environments**: ✅ Production, ✅ Preview, ✅ Development

#### VITE_VONAGE_API_SECRET
- **Name**: `VITE_VONAGE_API_SECRET`
- **Value**: Seu Secret do Vonage
- **Environments**: ✅ Production, ✅ Preview, ✅ Development

#### VITE_VONAGE_APPLICATION_ID
- **Name**: `VITE_VONAGE_APPLICATION_ID`
- **Value**: Seu Application ID do Vonage
- **Environments**: ✅ Production, ✅ Preview, ✅ Development

#### VITE_VONAGE_WHATSAPP_FROM
- **Name**: `VITE_VONAGE_WHATSAPP_FROM`
- **Value**: Seu número WhatsApp SEM o + (ex: `553182612947`)
- **Environments**: ✅ Production, ✅ Preview, ✅ Development

#### VITE_VONAGE_PRIVATE_KEY
- **Name**: `VITE_VONAGE_PRIVATE_KEY`
- **Value**: Sua chave privada completa (incluindo `-----BEGIN PRIVATE KEY-----` e `-----END PRIVATE KEY-----`)
- **Environments**: ✅ Production, ✅ Preview, ✅ Development

### 5️⃣ Fazer Redeploy

1. Após adicionar todas as variáveis, vá em **Deployments**
2. Clique nos **3 pontos (⋯)** do último deploy
3. Selecione **Redeploy**
4. Aguarde o build completar (2-3 minutos)

### 6️⃣ Verificar se Funcionou

1. Acesse seu app na URL da Vercel
2. Abra o **Console do navegador** (F12)
3. Deve aparecer: `Supabase Config: { url: 'Set', key: 'Set' }`
4. **NÃO** deve aparecer erros de variáveis de ambiente

## 🔍 Onde Encontrar suas Credenciais

### Supabase (no seu arquivo .env local)
```
VITE_SUPABASE_URL=https://bukigyhhgrtgryklabjg.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Vonage (no seu arquivo .env local)
```
VITE_VONAGE_API_KEY=1f83881f
VITE_VONAGE_API_SECRET=ZkPremios2024!
...
```

## ⚠️ Importante

- **Use SUAS próprias credenciais**, não as do exemplo
- **Marque todos os ambientes** (Production, Preview, Development)
- **Faça redeploy** após adicionar as variáveis
- **Teste no console** se as variáveis carregaram

## 🚨 Se der Erro

1. **Verifique os nomes** das variáveis (devem ter `VITE_`)
2. **Confirme os valores** (sem espaços extras)
3. **Marque os ambientes** corretos
4. **Faça redeploy** novamente
5. **Limpe o cache** do navegador

---

✅ **Resultado**: Seu app funcionará perfeitamente na Vercel com suas próprias credenciais!