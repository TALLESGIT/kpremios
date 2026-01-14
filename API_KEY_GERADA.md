# 🔐 API Key Gerada com Sucesso!

## ✅ Sua API Key

```
261387f8444ef4334c3fc994cf7bde037e9319c0accf0e31deee705b20b80628
```

---

## ⚙️ Como Configurar

### ⚠️ IMPORTANTE: Evolution API em Servidor Externo

A Evolution API rodará em um **servidor separado** (não localmente).  
A pasta `evolution-api-main/` pode ser excluída do projeto.

**Veja:** `CONFIGURACAO_EVOLUTION_API_EXTERNA.md` para configuração completa no servidor.

### 1. Frontend (`.env` na raiz do projeto)

Adicione no arquivo `.env` na raiz:

```env
VITE_EVOLUTION_API_KEY=261387f8444ef4334c3fc994cf7bde037e9319c0accf0e31deee705b20b80628
```

**⚠️ IMPORTANTE:** Use a MESMA chave em ambos os lugares!

---

## 📋 Configuração no Servidor da Evolution API

**⚠️ NOTA:** Esta configuração deve ser feita no servidor onde a Evolution API está rodando, não no projeto local.

Veja `CONFIGURACAO_EVOLUTION_API_EXTERNA.md` para instruções completas.

Exemplo do `.env` no servidor:

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
DATABASE_CONNECTION_URI=postgresql://postgres:Joao123.@&*(@db.bukigyhhgrtgryklabjg.supabase.co:5432/postgres?schema=evolution_api
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
AUTHENTICATION_API_KEY=261387f8444ef4334c3fc994cf7bde037e9319c0accf0e31deee705b20b80628
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

# ===========================================
# WEBSOCKET
# ===========================================
WEBSOCKET_ENABLED=true
WEBSOCKET_GLOBAL_EVENTS=true
```

---

## 📋 Configuração do Frontend (`.env` na raiz)

Adicione ou atualize no arquivo `.env` na raiz do projeto:

```env
# ============================================
# EVOLUTION API - WHATSAPP (PRINCIPAL)
# ============================================
VITE_EVOLUTION_API_ENABLED=true
VITE_EVOLUTION_API_URL=http://localhost:8080
VITE_EVOLUTION_API_KEY=261387f8444ef4334c3fc994cf7bde037e9319c0accf0e31deee705b20b80628
VITE_EVOLUTION_INSTANCE_NAME=ZkOficial
```

---

## ✅ Checklist

- [x] API Key gerada
- [ ] API Key configurada no `.env` do frontend
- [ ] Evolution API configurada no servidor externo (veja `CONFIGURACAO_EVOLUTION_API_EXTERNA.md`)
- [ ] API Key configurada no servidor da Evolution API
- [ ] Redis configurado no servidor
- [ ] Evolution API rodando no servidor
- [ ] Instância WhatsApp criada e conectada

---

## 🚀 Próximos Passos

1. ✅ API Key gerada (feito!)
2. ⏭️ Criar arquivo `.env` em `evolution-api-main/` com a configuração acima
3. ⏭️ Configurar Redis
4. ⏭️ Iniciar Evolution API
5. ⏭️ Criar instância WhatsApp

---

## ⚠️ Segurança

- ✅ API Key gerada de forma segura (64 caracteres hexadecimais)
- ⚠️ **NÃO compartilhe** esta chave publicamente
- ⚠️ **NÃO commite** o arquivo `.env` no Git
- ✅ Use a mesma chave em Evolution API e Frontend

---

**Status:** ✅ API Key gerada e pronta para uso!

