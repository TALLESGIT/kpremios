# 🚀 Guia de Deploy na Vercel

## Erro Identificado
```
Missing Supabase environment variables: Object
Uncaught Error: Missing Supabase environment variables. Please check your .env file.
```

## Causa do Problema
As variáveis de ambiente do arquivo `.env` local não são automaticamente transferidas para a Vercel. É necessário configurá-las manualmente no painel da Vercel.

## ✅ Solução: Configurar Variáveis de Ambiente na Vercel

### Passo 1: Acessar o Painel da Vercel
1. Acesse [vercel.com](https://vercel.com)
2. Faça login na sua conta
3. Selecione o projeto `kpremios`
4. Vá para **Settings** → **Environment Variables**

### Passo 2: Adicionar as Variáveis Necessárias
Adicione as seguintes variáveis de ambiente:

#### 🔵 Supabase (OBRIGATÓRIAS)
```
VITE_SUPABASE_URL=https://bukigyhhgrtgryklabjg.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1a2lneWhoZ3J0Z3J5a2xhYmpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNDk5NTcsImV4cCI6MjA3MjkyNTk1N30.Fj4f7LatljCx8SUFgH6un_jldg5eXrI37XB4DK7vSog
```

#### 🟢 Vonage (OPCIONAIS - para WhatsApp)
```
VITE_VONAGE_REAL_MODE=true
VITE_VONAGE_API_KEY=1f83881f
VITE_VONAGE_API_SECRET=ZkPremios2024!
VITE_VONAGE_APPLICATION_ID=2ac17003-9897-415e-b1f4-db6b2c059b2c
VITE_VONAGE_WHATSAPP_FROM=553182612947
VITE_VONAGE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKB
UxoiWnoon5XpM6fvB05E4P1BHAoAl2zQgSXC6wM6aGmUIHAgMBAAGjFzBVBDbrn7
IxUzs8VGWvoxA+chNVQaptcABTTsY2kkT+5fXAYfBcXDutIWQe4a5WDFsOgRe6+
vsKMofHJ/7XxL5ZRE6pyuJYKDmvfOcQ5N4Kzv5BaeplA0zRL3LDgHRgHchCMWtW
LtjkQRo6h+I2UnSJKDzR9+Gs+oDjVCRdwbMoZzS6J+bgqtFhn+R6F6VAdVI+bz
93JCWw+2tuPrAh+CjoDMrq9l9gcHDmlTxtQ5wBAoGBAMjlC+Zg5EMXn5+zKwRz
BAAoGBANWwQEd2QRslLIgtMjXSlKAoGAVwmNOurA+6Nn+r1/RiiFXP+A4qyBXm
NiMI4GE4Owk8jlCHjVBg5gIkB+Dk1kSBWFQy5Qg+t4uHVFRjEqiQKBgBi0FlL
5pz/jw0F4iyMKasx9h1T3AoGBALCikRxdDaqGWqaTitd71zKApBRBXuGiYn5cB
xoGdHqHRJ1OPMg+IS1isb+IgYhOywpb1+pCr+AoGBALNiWtBelC8ilkHIFSEd
BAAoGBAKhEM4+0nVY+N5m5otfTRpROhHOmkhTkp/VVpI+xuxAoGBALYkrHaTiM
M1VX/+Tn/jhFWRQqXMUQHSU8jXzSL1j4bXysP7odBlL1wh+Ng+Q+2MjM8r+V
rQkLA==
-----END PRIVATE KEY-----
```

### Passo 3: Configurar Ambientes
Para cada variável, configure os ambientes:
- ✅ **Production** (obrigatório)
- ✅ **Preview** (recomendado)
- ✅ **Development** (opcional)

### Passo 4: Fazer Redeploy
Após adicionar as variáveis:
1. Vá para **Deployments**
2. Clique nos **3 pontos** do último deploy
3. Selecione **Redeploy**
4. Aguarde o build completar

## 🔧 Verificação Local
Para testar localmente se as variáveis estão corretas:

```bash
# No terminal do projeto
npm run dev
```

Verifique no console do navegador se aparece:
```
Supabase Config: { url: 'Set', key: 'Set' }
```

## 🚨 Problemas Comuns

### 1. Favicon 404
```
/zk-favicon.svg:1 Failed to load resource: the server responded with a status of 404
```
**Solução**: Adicionar o arquivo `zk-favicon.svg` na pasta `public/`

### 2. Variáveis não carregam
- Verifique se o nome está exato (incluindo `VITE_`)
- Confirme se foi salvo para o ambiente correto
- Faça redeploy após adicionar variáveis

### 3. Chave privada com quebras de linha
Para a `VITE_VONAGE_PRIVATE_KEY`, mantenha as quebras de linha:
```
-----BEGIN PRIVATE KEY-----
[conteúdo da chave]
-----END PRIVATE KEY-----
```

## 📋 Checklist de Deploy

- [ ] Variáveis do Supabase configuradas
- [ ] Variáveis do Vonage configuradas (se usar WhatsApp)
- [ ] Ambientes selecionados (Production + Preview)
- [ ] Redeploy realizado
- [ ] Teste da aplicação funcionando
- [ ] Console sem erros de variáveis

## 🎯 Resultado Esperado
Após seguir estes passos:
- ✅ App carrega sem erros de variáveis
- ✅ Supabase conecta corretamente
- ✅ WhatsApp Vonage funciona (se configurado)
- ✅ Todas as funcionalidades operacionais

---

**💡 Dica**: Mantenha as variáveis de ambiente sempre atualizadas tanto localmente quanto na Vercel para evitar inconsistências.