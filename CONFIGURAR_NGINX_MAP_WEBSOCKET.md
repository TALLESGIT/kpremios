# 🔧 Configurar Map WebSocket no Nginx

## ⚠️ PROBLEMA CRÍTICO

O `map $http_upgrade $connection_upgrade` **DEVE** estar no nível `http` do `nginx.conf`, **NÃO** no arquivo do site.

Se estiver no arquivo do site, o Nginx não consegue usar a variável `$connection_upgrade`.

---

## ✅ SOLUÇÃO

### Opção 1: Adicionar diretamente no nginx.conf (Recomendado)

**1. Editar nginx.conf:**

```bash
nano /etc/nginx/nginx.conf
```

**2. Dentro do bloco `http {`, adicionar ANTES de qualquer `include`:**

```nginx
http {
    # ... outras configurações ...
    
    # Map para WebSocket upgrade (DEVE estar aqui, no nível http)
    map $http_upgrade $connection_upgrade {
        default upgrade;
        ''      close;
    }
    
    # ... resto das configurações ...
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
```

**3. Testar e recarregar:**

```bash
nginx -t
systemctl reload nginx
```

---

### Opção 2: Usar arquivo separado

**1. Criar arquivo de configuração:**

```bash
nano /etc/nginx/conf.d/websocket-upgrade.conf
```

**2. Adicionar conteúdo:**

```nginx
# Map para detectar upgrade de conexão WebSocket
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}
```

**3. No nginx.conf, dentro do bloco `http {`, adicionar:**

```nginx
http {
    # ... outras configurações ...
    
    # Incluir map para WebSocket
    include /etc/nginx/conf.d/websocket-upgrade.conf;
    
    # ... resto das configurações ...
}
```

**4. Testar e recarregar:**

```bash
nginx -t
systemctl reload nginx
```

---

## ✅ Verificar se está funcionando

**1. Verificar se o map está carregado:**

```bash
nginx -T | grep -A 3 "map.*upgrade"
```

**Deve mostrar:**
```
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}
```

**2. Testar WebSocket:**

```bash
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Host: api.zkoficial.com.br" \
  -H "Origin: https://www.zkoficial.com.br" \
  https://api.zkoficial.com.br/socket.io/?EIO=4&transport=websocket
```

**Deve retornar:** `101 Switching Protocols`

---

## 🆘 Se ainda não funcionar

**Verificar logs do Nginx:**

```bash
tail -f /var/log/nginx/api.zkoficial.com.br-error.log
```

**Verificar se a variável está sendo usada:**

```bash
# No arquivo do site, verificar se usa $connection_upgrade
grep connection_upgrade /etc/nginx/sites-available/api.zkoficial.com.br
```

**Deve mostrar:** `proxy_set_header Connection $connection_upgrade;`

---

**Última atualização:** 2024
