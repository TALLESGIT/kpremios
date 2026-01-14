# 🔗 Integração Supabase + Evolution API

## ✅ Sim! Você PODE usar o Supabase com Evolution API!

O **Supabase é baseado em PostgreSQL**, e a **Evolution API também usa PostgreSQL**. Isso significa que você pode usar o **mesmo banco de dados** para ambos! 🎉

---

## 🎯 Vantagens de Usar Supabase

### ✅ **Economia de Recursos**
- Não precisa de servidor PostgreSQL separado
- Usa o mesmo banco que já está configurado
- Economiza custos de infraestrutura

### ✅ **Simplicidade**
- Uma única fonte de dados
- Fácil backup e manutenção
- Menos configurações para gerenciar

### ✅ **Escalabilidade**
- Supabase já é escalável
- Não precisa configurar banco separado
- Gerenciamento centralizado

---

## 📋 Como Obter a Connection String do Supabase

### Passo 1: Acessar o Dashboard
1. Vá para [https://app.supabase.com](https://app.supabase.com)
2. Selecione seu projeto

### Passo 2: Obter Connection String
1. Vá em **Settings** → **Database**
2. Role até a seção **Connection string**
3. Selecione **URI** (não "Session mode")
4. Copie a string que aparece assim:

```
postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

### Passo 3: Substituir a Senha
A string vem com `[YOUR-PASSWORD]`. Você precisa substituir pela senha real do banco:

1. Vá em **Settings** → **Database** → **Database password**
2. Se não souber, pode resetar a senha
3. Substitua `[YOUR-PASSWORD]` na connection string

**Exemplo final:**
```
postgresql://postgres:MinhaSenha123@db.abcdefghijklmnop.supabase.co:5432/postgres
```

---

## 🔧 Configuração da Evolution API

### Opção 1: Usar o Mesmo Schema (Recomendado para Início)

A Evolution API criará suas próprias tabelas no schema `public` (padrão). Isso funciona, mas pode causar conflitos de nomes.

**Configuração no `.env` da Evolution API:**
```env
# evolution-api-main/.env

# Banco de Dados - Usando Supabase
DATABASE_PROVIDER=postgresql
DATABASE_CONNECTION_URI=postgresql://postgres:SUA_SENHA@db.SEU_PROJECT_REF.supabase.co:5432/postgres
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
```

### Opção 2: Usar Schema Separado (Recomendado para Produção)

Criar um schema separado para a Evolution API evita conflitos.

**1. Criar schema no Supabase:**
```sql
-- Execute no SQL Editor do Supabase
CREATE SCHEMA IF NOT EXISTS evolution_api;
```

**2. Configurar Evolution API:**
```env
# evolution-api-main/.env

DATABASE_PROVIDER=postgresql
DATABASE_CONNECTION_URI=postgresql://postgres:SUA_SENHA@db.SEU_PROJECT_REF.supabase.co:5432/postgres?schema=evolution_api
DATABASE_CONNECTION_CLIENT_NAME=evolution
```

---

## ⚠️ Importante: Redis Ainda é Necessário

A Evolution API **ainda precisa do Redis** para cache, mesmo usando Supabase para o banco.

### Opções para Redis:

#### Opção 1: Redis Local (Desenvolvimento)
```bash
# Instalar Redis localmente
# Windows: https://github.com/microsoftarchive/redis/releases
# Linux/Mac: brew install redis ou apt-get install redis

# Iniciar Redis
redis-server
```

#### Opção 2: Redis Cloud (Produção - Gratuito)
1. Acesse [https://redis.com/try-free/](https://redis.com/try-free/)
2. Crie uma conta gratuita
3. Crie um banco Redis
4. Copie a connection string

**Configuração:**
```env
# evolution-api-main/.env
CACHE_REDIS_ENABLED=true
CACHE_REDIS_URI=redis://default:SUA_SENHA@redis-12345.c1.us-east-1-1.ec2.cloud.redislabs.com:12345
CACHE_REDIS_PREFIX_KEY=evolution-cache
CACHE_REDIS_TTL=604800
CACHE_REDIS_SAVE_INSTANCES=true
```

#### Opção 3: Docker Redis (Recomendado)
```yaml
# evolution-api-main/docker-compose.yaml
services:
  redis:
    container_name: evolution_redis
    image: redis:latest
    restart: always
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
```

---

## 📊 Estrutura Final Recomendada

### Para Desenvolvimento:
```
┌─────────────────────────────────┐
│     ZK Premios (Frontend)       │
│         ↓                       │
│    Supabase (PostgreSQL)        │ ← Banco principal
│         ↑                       │
│   Evolution API (Backend)        │ ← Usa mesmo banco
│         ↓                       │
│    Redis Local/Docker           │ ← Cache necessário
└─────────────────────────────────┘
```

### Para Produção:
```
┌─────────────────────────────────┐
│     ZK Premios (Vercel)         │
│         ↓                       │
│    Supabase (PostgreSQL)        │ ← Banco principal
│         ↑                       │
│   Evolution API (VPS/Cloud)      │ ← Usa mesmo banco
│         ↓                       │
│    Redis Cloud                   │ ← Cache na nuvem
└─────────────────────────────────┘
```

---

## 🚀 Passo a Passo Completo

### 1. Obter Connection String do Supabase
```bash
# No Dashboard do Supabase:
# Settings → Database → Connection string → URI
# Substitua [YOUR-PASSWORD] pela senha real
```

### 2. Configurar Evolution API
```bash
cd evolution-api-main
cp env.example .env
```

Edite o `.env`:
```env
# Servidor
SERVER_PORT=8080
SERVER_URL=http://localhost:8080

# Banco - Usando Supabase
DATABASE_PROVIDER=postgresql
DATABASE_CONNECTION_URI=postgresql://postgres:SUA_SENHA@db.SEU_PROJECT_REF.supabase.co:5432/postgres

# Redis (necessário)
CACHE_REDIS_ENABLED=true
CACHE_REDIS_URI=redis://localhost:6379

# Autenticação
AUTHENTICATION_API_KEY=SUA_CHAVE_SECRETA_AQUI
```

### 3. Configurar Redis
```bash
# Opção A: Docker
docker run -d -p 6379:6379 redis:latest

# Opção B: Local
redis-server
```

### 4. Iniciar Evolution API
```bash
cd evolution-api-main
docker-compose up -d
# ou
npm install
npm run start
```

### 5. Verificar Conexão
```bash
# Verificar se conectou ao Supabase
# Acesse: http://localhost:8080/instance/fetchInstances
# Headers: { "apikey": "SUA_CHAVE_SECRETA_AQUI" }
```

---

## 🔍 Verificar Tabelas Criadas

A Evolution API criará tabelas no Supabase. Você pode verificar:

1. **No Dashboard do Supabase:**
   - Vá em **Database** → **Tables**
   - Procure por tabelas como:
     - `instance`
     - `message`
     - `chat`
     - `contact`
     - etc.

2. **Via SQL:**
```sql
-- Ver todas as tabelas criadas pela Evolution API
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name LIKE '%instance%' 
   OR table_name LIKE '%message%'
   OR table_name LIKE '%chat%';
```

---

## ⚠️ Cuidados e Boas Práticas

### 1. **Backup**
- O Supabase já faz backup automático
- Mas certifique-se de ter backups regulares

### 2. **Limites do Supabase**
- **Free Tier**: 500MB de banco, 2GB de bandwidth
- **Pro Tier**: 8GB de banco, 50GB de bandwidth
- Monitore o uso no dashboard

### 3. **Segurança**
- Use a connection string com senha forte
- Não commite a connection string no Git
- Use variáveis de ambiente

### 4. **Performance**
- Evolution API pode criar muitas tabelas
- Monitore o tamanho do banco
- Considere limpar dados antigos periodicamente

### 5. **Schema Separado (Recomendado)**
```sql
-- Criar schema separado
CREATE SCHEMA IF NOT EXISTS evolution_api;

-- Dar permissões
GRANT ALL ON SCHEMA evolution_api TO postgres;
```

---

## 📝 Variáveis de Ambiente Completas

### `.env` do Projeto Principal
```env
# Supabase (já configurado)
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon

# Evolution API (novo)
VITE_EVOLUTION_API_URL=http://localhost:8080
VITE_EVOLUTION_API_KEY=SUA_CHAVE_SECRETA
VITE_EVOLUTION_INSTANCE_NAME=ZkOficial
VITE_EVOLUTION_API_ENABLED=true
```

### `.env` da Evolution API
```env
# Servidor
SERVER_PORT=8080
SERVER_URL=http://localhost:8080

# Banco - Supabase
DATABASE_PROVIDER=postgresql
DATABASE_CONNECTION_URI=postgresql://postgres:SUA_SENHA@db.SEU_PROJECT_REF.supabase.co:5432/postgres

# Redis
CACHE_REDIS_ENABLED=true
CACHE_REDIS_URI=redis://localhost:6379

# Autenticação
AUTHENTICATION_API_KEY=SUA_CHAVE_SECRETA_AQUI
```

---

## 🎯 Resumo

✅ **SIM, você pode usar Supabase com Evolution API!**

**Vantagens:**
- ✅ Economia (não precisa de PostgreSQL separado)
- ✅ Simplicidade (um banco só)
- ✅ Escalabilidade (Supabase já escala)
- ✅ Backup automático

**O que você ainda precisa:**
- ⚠️ Redis (para cache da Evolution API)
- ⚠️ Servidor para rodar Evolution API (ou usar Docker)

**Próximos passos:**
1. Obter connection string do Supabase
2. Configurar Evolution API com essa string
3. Configurar Redis (local ou cloud)
4. Iniciar Evolution API
5. Testar conexão

---

## 🔗 Links Úteis

- [Supabase Dashboard](https://app.supabase.com)
- [Supabase Database Settings](https://app.supabase.com/project/_/settings/database)
- [Evolution API Docs](https://doc.evolution-api.com)
- [Redis Cloud (Gratuito)](https://redis.com/try-free/)

---

**Criado em:** 2025-01-11  
**Status:** Guia completo - Pronto para implementação

