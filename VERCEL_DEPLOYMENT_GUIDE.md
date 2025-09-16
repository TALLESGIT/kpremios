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
⚠️ **IMPORTANTE**: Use suas próprias credenciais do Supabase, não as do exemplo!

```
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_aqui
```

**Como obter suas credenciais:**
1. Acesse [supabase.com](https://supabase.com)
2. Vá para seu projeto
3. Settings → API
4. Copie a **URL** e **anon/public key**

#### 🟢 Vonage (OPCIONAIS - para WhatsApp)
⚠️ **IMPORTANTE**: Use suas próprias credenciais do Vonage!

```
VITE_VONAGE_REAL_MODE=true
VITE_VONAGE_API_KEY=sua_api_key_aqui
VITE_VONAGE_API_SECRET=seu_secret_aqui
VITE_VONAGE_APPLICATION_ID=seu_application_id_aqui
VITE_VONAGE_WHATSAPP_FROM=seu_numero_sem_plus
VITE_VONAGE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
sua_chave_privada_completa_aqui
-----END PRIVATE KEY-----
```

**Como obter suas credenciais:**
1. Consulte o arquivo `SUAS_CREDENCIAIS_VONAGE.md`
2. Ou acesse [developer.vonage.com](https://developer.vonage.com)
3. Configure sua aplicação WhatsApp

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