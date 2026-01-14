# 🚀 Setup Completo - Evolution API + Supabase

## Guia Profissional e Moderno para Integração 100% Funcional

---

## 📋 Pré-requisitos

- ✅ Projeto Supabase configurado
- ✅ Node.js instalado
- ✅ Docker instalado (opcional, mas recomendado)
- ✅ Acesso ao Dashboard do Supabase

---

## 🔧 Passo 1: Criar Schema Separado no Supabase

### Opção A: Via SQL Editor (Recomendado)

1. Acesse [Supabase Dashboard](https://app.supabase.com)
2. Vá em **SQL Editor**
3. Execute o script:

```sql
-- Criar schema separado
CREATE SCHEMA IF NOT EXISTS evolution_api;

-- Dar permissões
GRANT ALL ON SCHEMA evolution_api TO postgres;
GRANT ALL ON SCHEMA evolution_api TO authenticated;
GRANT ALL ON SCHEMA evolution_api TO service_role;

-- Comentário
COMMENT ON SCHEMA evolution_api IS 'Schema dedicado para Evolution API - WhatsApp integration';
```

### Opção B: Via Migração

O arquivo `supabase/migrations/999999_create_evolution_api_schema.sql` já foi criado. Aplique:

```bash
# Via Supabase CLI
supabase db push

# Ou copie e cole no SQL Editor do Supabase
```

---

## 🔑 Passo 2: Obter Connection String do Supabase

1. **Dashboard Supabase** → **Settings** → **Database**
2. Role até **Connection string**
3. Selecione **URI** (não "Session mode")
4. Copie a string que aparece:

```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

**OU** (Connection pooling):

```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

5. **Substitua `[PASSWORD]`** pela senha real do banco:
   - **Settings** → **Database** → **Database password**
   - Se não souber, pode resetar

**Exemplo final:**
```
postgresql://postgres:MinhaSenha123@db.abcdefghijklmnop.supabase.co:5432/postgres?schema=evolution_api
```

**⚠️ IMPORTANTE:** Adicione `?schema=evolution_api` no final para usar o schema separado!

---

## 📦 Passo 3: Configurar Evolution API

### 3.1. Criar arquivo `.env` na pasta `evolution-api-main`

```bash
cd evolution-api-main
cp env.example .env
```

### 3.2. Editar `.env` com suas configurações:

```env
# ===========================================
# SERVIDOR
# ===========================================
SERVER_NAME=evolution
SERVER_TYPE=http
SERVER_PORT=8080
SERVER_URL=http://localhost:8080
SERVER_DISABLE_DOCS=false
SERVER_DISABLE_MANAGER=false

# ===========================================
# CORS
# ===========================================
CORS_ORIGIN=*
CORS_METHODS=POST,GET,PUT,DELETE
CORS_CREDENTIALS=true

# ===========================================
# BANCO DE DADOS - SUPABASE
# ===========================================
DATABASE_PROVIDER=postgresql
DATABASE_CONNECTION_URI=postgresql://postgres:SUA_SENHA@db.SEU_PROJECT_REF.supabase.co:5432/postgres?schema=evolution_api
DATABASE_CONNECTION_CLIENT_NAME=evolution

# Configurações de salvamento
DATABASE_SAVE_DATA_INSTANCE=true
DATABASE_SAVE_DATA_NEW_MESSAGE=true
DATABASE_SAVE_MESSAGE_UPDATE=true
DATABASE_SAVE_DATA_CONTACTS=true
DATABASE_SAVE_DATA_CHATS=true
DATABASE_SAVE_DATA_HISTORIC=true
DATABASE_SAVE_DATA_LABELS=true
DATABASE_SAVE_IS_ON_WHATSAPP=true
DATABASE_SAVE_IS_ON_WHATSAPP_DAYS=7
DATABASE_DELETE_MESSAGE=false

# ===========================================
# REDIS
# ===========================================
CACHE_REDIS_ENABLED=true
CACHE_REDIS_URI=redis://localhost:6379
CACHE_REDIS_PREFIX_KEY=evolution-cache
CACHE_REDIS_TTL=604800
CACHE_REDIS_SAVE_INSTANCES=true

# Cache local (fallback)
CACHE_LOCAL_ENABLED=true
CACHE_LOCAL_TTL=86400

# ===========================================
# AUTENTICAÇÃO
# ===========================================
AUTHENTICATION_API_KEY=SUA_CHAVE_SECRETA_AQUI_GERE_UMA_ALEATORIA
AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES=false

# ===========================================
# LOGS
# ===========================================
LOG_LEVEL=ERROR,WARN,DEBUG,INFO,LOG,VERBOSE,DARK,WEBHOOKS,WEBSOCKET
LOG_COLOR=true
LOG_BAILEYS=error

# ===========================================
# INSTÂNCIAS
# ===========================================
DEL_INSTANCE=false
DEL_TEMP_INSTANCES=true

# ===========================================
# IDIOMA
# ===========================================
LANGUAGE=pt-BR
```

**🔐 Gerar API Key segura:**
```bash
# Linux/Mac
openssl rand -hex 32

# Windows (PowerShell)
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

---

## 🐳 Passo 4: Configurar Redis

### Opção A: Docker (Recomendado)

```bash
docker run -d \
  --name evolution-redis \
  -p 6379:6379 \
  redis:latest \
  redis-server --appendonly yes
```

### Opção B: Instalação Local

**Windows:**
- Download: https://github.com/microsoftarchive/redis/releases
- Instalar e iniciar o serviço

**Linux:**
```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis
```

**Mac:**
```bash
brew install redis
brew services start redis
```

### Opção C: Redis Cloud (Produção)

1. Acesse [Redis Cloud](https://redis.com/try-free/)
2. Crie conta gratuita
3. Crie um banco
4. Copie a connection string
5. Atualize no `.env`:
```env
CACHE_REDIS_URI=redis://default:SUA_SENHA@redis-12345.c1.us-east-1-1.ec2.cloud.redislabs.com:12345
```

---

## 🚀 Passo 5: Iniciar Evolution API

### Opção A: Docker Compose (Recomendado)

```bash
cd evolution-api-main
docker-compose up -d
```

### Opção B: Node.js Direto

```bash
cd evolution-api-main
npm install
npm run start
```

### Verificar se está rodando:

```bash
# Verificar logs
docker-compose logs -f

# Ou
npm run start
```

Acesse: http://localhost:8080

---

## 📱 Passo 6: Configurar Instância WhatsApp

### 6.1. Acessar Manager

1. Abra: http://localhost:3000 (Manager)
2. Ou acesse: http://localhost:8080/docs (API Docs)

### 6.2. Criar Instância

**Via API:**
```bash
curl -X POST http://localhost:8080/instance/create \
  -H "apikey: SUA_CHAVE_SECRETA_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "ZkOficial",
    "qrcode": true
  }'
```

**Via Manager (Interface Web):**
1. Acesse http://localhost:3000
2. Clique em "Criar Instância"
3. Nome: `ZkOficial`
4. Clique em "Criar"

### 6.3. Escanear QR Code

1. Abra WhatsApp no celular
2. Vá em **Configurações** → **Aparelhos conectados** → **Conectar um aparelho**
3. Escaneie o QR Code exibido
4. Aguarde conexão (status: "open")

---

## ⚙️ Passo 7: Configurar Frontend

### 7.1. Adicionar variáveis no `.env` do projeto principal:

```env
# ============================================
# EVOLUTION API - WHATSAPP (PRINCIPAL)
# ============================================
VITE_EVOLUTION_API_ENABLED=true
VITE_EVOLUTION_API_URL=http://localhost:8080
VITE_EVOLUTION_API_KEY=SUA_CHAVE_SECRETA_AQUI
VITE_EVOLUTION_INSTANCE_NAME=ZkOficial

# ============================================
# TWILIO (OPCIONAL - FALLBACK)
# ============================================
# Deixe vazio se não quiser usar Twilio
# VITE_TWILIO_ACCOUNT_SID=
# VITE_TWILIO_AUTH_TOKEN=
# VITE_TWILIO_WHATSAPP_FROM=
# VITE_TWILIO_FALLBACK_ENABLED=false
```

### 7.2. Reiniciar servidor de desenvolvimento:

```bash
npm run dev
```

---

## ✅ Passo 8: Testar Integração

### 8.1. Verificar Status da Instância

```bash
curl -X GET http://localhost:8080/instance/fetchInstances \
  -H "apikey: SUA_CHAVE_SECRETA_AQUI"
```

Deve retornar:
```json
{
  "instance": {
    "instanceName": "ZkOficial",
    "status": "open"
  }
}
```

### 8.2. Testar Envio de Mensagem

**Via código:**
```typescript
import { whatsappService } from './services/whatsappService';

const result = await whatsappService.sendMessage({
  to: '5533999030124',
  message: '',
  type: 'pool_winner',
  name: 'Teste',
  matchTitle: 'Teste x Teste',
  predictedScore: '2 x 1',
  realScore: '2 x 1',
  prize: '100.00',
  totalAmount: '100.00',
  winnersCount: '1'
});

console.log(result);
```

**Via API direta:**
```bash
curl -X POST http://localhost:8080/message/sendText/ZkOficial \
  -H "apikey: SUA_CHAVE_SECRETA_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "5533999030124",
    "text": "Teste de mensagem"
  }'
```

---

## 🔍 Verificação Final

### ✅ Checklist:

- [ ] Schema `evolution_api` criado no Supabase
- [ ] Connection string configurada no `.env` da Evolution API
- [ ] Redis rodando (porta 6379)
- [ ] Evolution API rodando (porta 8080)
- [ ] Instância WhatsApp criada e conectada (status: "open")
- [ ] Variáveis de ambiente configuradas no frontend
- [ ] Teste de envio funcionando

---

## 🐛 Troubleshooting

### Erro: "Instância não conectada"
- Verifique se escaneou o QR Code
- Verifique status: `GET /instance/fetchInstances`
- Reconecte se necessário

### Erro: "Connection refused" no Redis
- Verifique se Redis está rodando: `redis-cli ping`
- Verifique porta 6379: `netstat -an | grep 6379`

### Erro: "Database connection failed"
- Verifique connection string do Supabase
- Verifique se adicionou `?schema=evolution_api`
- Verifique senha do banco

### Erro: "API Key inválida"
- Verifique `AUTHENTICATION_API_KEY` no `.env`
- Use a mesma chave no frontend (`VITE_EVOLUTION_API_KEY`)

---

## 📊 Monitoramento

### Ver Logs da Evolution API:

```bash
# Docker
docker-compose logs -f evolution_api

# Node.js
# Logs aparecem no console
```

### Verificar Tabelas no Supabase:

```sql
-- Ver tabelas criadas pela Evolution API
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'evolution_api'
ORDER BY table_name;
```

---

## 🚀 Deploy em Produção

### 1. Evolution API em VPS/Cloud

- Use Docker Compose
- Configure variáveis de ambiente
- Use Redis Cloud ou Redis no mesmo servidor
- Configure domínio e SSL

### 2. Atualizar Frontend

```env
# Produção
VITE_EVOLUTION_API_URL=https://api.evolution.seusite.com
VITE_EVOLUTION_API_KEY=SUA_CHAVE_SECRETA
```

### 3. Segurança

- ✅ Use HTTPS
- ✅ Proteja API Key
- ✅ Configure CORS corretamente
- ✅ Use firewall
- ✅ Monitore logs

---

## 📚 Documentação Adicional

- [Evolution API Docs](https://doc.evolution-api.com)
- [Supabase Docs](https://supabase.com/docs)
- [Redis Docs](https://redis.io/docs)

---

**Criado em:** 2025-01-11  
**Status:** Setup completo e funcional ✅

