# 🌐 Configuração Evolution API Externa

## 📍 Situação

A Evolution API será rodada em um **servidor separado** (não localmente no projeto).  
A pasta `evolution-api-main/` pode ser excluída do projeto.

---

## ⚙️ Configuração no Frontend

### Arquivo `.env` na raiz do projeto:

```env
# ============================================
# EVOLUTION API - WHATSAPP (SERVIDOR EXTERNO)
# ============================================
VITE_EVOLUTION_API_ENABLED=true
VITE_EVOLUTION_API_URL=https://sua-evolution-api.com
VITE_EVOLUTION_API_KEY=261387f8444ef4334c3fc994cf7bde037e9319c0accf0e31deee705b20b80628
VITE_EVOLUTION_INSTANCE_NAME=ZkOficial
```

**⚠️ IMPORTANTE:** 
- `VITE_EVOLUTION_API_URL` deve apontar para o servidor onde a Evolution API está rodando
- Use `https://` para produção
- Use `http://localhost:8080` apenas se estiver testando localmente

---

## 🚀 Onde Rodar a Evolution API?

### Opções:

1. **VPS/Cloud (Recomendado para Produção)**
   - DigitalOcean, AWS, Azure, etc.
   - Use Docker Compose
   - Configure domínio e SSL

2. **Servidor Dedicado**
   - Qualquer servidor Linux
   - Instale Docker e rode via Docker Compose

3. **Local (Desenvolvimento)**
   - Apenas para testes
   - `http://localhost:8080`

---

## 📋 Configuração da Evolution API no Servidor

### 1. No servidor onde rodará a Evolution API:

Crie o arquivo `.env` com:

```env
# SERVIDOR
SERVER_PORT=8080
SERVER_URL=https://sua-evolution-api.com

# BANCO DE DADOS - SUPABASE
DATABASE_PROVIDER=postgresql
DATABASE_CONNECTION_URI=postgresql://postgres:Joao123.@&*(@db.bukigyhhgrtgryklabjg.supabase.co:5432/postgres?schema=evolution_api

# REDIS
CACHE_REDIS_ENABLED=true
CACHE_REDIS_URI=redis://localhost:6379

# AUTENTICAÇÃO
AUTHENTICATION_API_KEY=261387f8444ef4334c3fc994cf7bde037e9319c0accf0e31deee705b20b80628

# IDIOMA
LANGUAGE=pt-BR

# WEBSOCKET
WEBSOCKET_ENABLED=true
WEBSOCKET_GLOBAL_EVENTS=true
```

### 2. Configure CORS para permitir seu frontend:

```env
CORS_ORIGIN=https://seu-frontend.com,https://www.seu-frontend.com
CORS_METHODS=POST,GET,PUT,DELETE
CORS_CREDENTIALS=true
```

---

## 🔧 Exemplo: Docker Compose no Servidor

Crie `docker-compose.yml` no servidor:

```yaml
version: "3.8"

services:
  evolution-api:
    container_name: evolution_api
    image: evoapicloud/evolution-api:latest
    restart: always
    ports:
      - "8080:8080"
    volumes:
      - evolution_instances:/evolution/instances
    env_file:
      - .env
    networks:
      - evolution-net

  redis:
    container_name: evolution_redis
    image: redis:latest
    restart: always
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - evolution-net

volumes:
  evolution_instances:
  redis_data:

networks:
  evolution-net:
    driver: bridge
```

Inicie:
```bash
docker-compose up -d
```

---

## 🌐 Configuração de Domínio (Produção)

### 1. Configure DNS
- Aponte um subdomínio para o IP do servidor
- Exemplo: `evolution-api.seudominio.com` → IP do servidor

### 2. Configure SSL (HTTPS)
- Use Nginx como reverse proxy
- Configure Let's Encrypt para certificado SSL

### 3. Nginx Config (exemplo)

```nginx
server {
    listen 80;
    server_name evolution-api.seudominio.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## ✅ Checklist

### No Servidor (Evolution API):
- [ ] Evolution API instalada/configurada
- [ ] Arquivo `.env` configurado com connection string do Supabase
- [ ] API Key configurada (mesma do frontend)
- [ ] Redis configurado e rodando
- [ ] Docker Compose configurado (se usar)
- [ ] Domínio configurado (produção)
- [ ] SSL/HTTPS configurado (produção)
- [ ] CORS configurado para permitir seu frontend
- [ ] Instância WhatsApp criada e conectada

### No Frontend:
- [ ] `.env` configurado com URL da Evolution API
- [ ] API Key configurada (mesma do servidor)
- [ ] `VITE_EVOLUTION_API_ENABLED=true`
- [ ] `VITE_EVOLUTION_INSTANCE_NAME=ZkOficial`

---

## 🔍 Testar Conexão

### 1. Verificar se Evolution API está acessível:

```bash
curl https://sua-evolution-api.com/instance/fetchInstances \
  -H "apikey: 261387f8444ef4334c3fc994cf7bde037e9319c0accf0e31deee705b20b80628"
```

### 2. Verificar status da instância:

```bash
curl https://sua-evolution-api.com/instance/fetchInstances \
  -H "apikey: 261387f8444ef4334c3fc994cf7bde037e9319c0accf0e31deee705b20b80628"
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

---

## 📚 Arquivos Importantes

1. **Este arquivo** - Configuração para servidor externo
2. `API_KEY_GERADA.md` - API Key gerada
3. `CONFIGURACAO_CONNECTION_STRING.md` - Connection string do Supabase
4. `SETUP_EVOLUTION_API_COMPLETO.md` - Guia completo (se rodar localmente)

---

## 🎯 Resumo

✅ **Frontend:** Configurado para usar Evolution API externa  
✅ **Supabase:** Schema `evolution_api` criado e pronto  
✅ **API Key:** Gerada e pronta para uso  
⏭️ **Próximo:** Configurar Evolution API no servidor externo  

---

**Status:** ✅ Configuração para servidor externo documentada!

