# 🔧 Corrigir Erro no nginx.conf

## ❌ Erro Atual

```
unexpected "{" in /etc/nginx/mime.types:2
```

Isso significa que há um erro de sintaxe no `nginx.conf`.

---

## ✅ SOLUÇÃO RÁPIDA

### Opção 1: Restaurar Backup (Se existir)

```bash
# Verificar backups disponíveis
ls -la /etc/nginx/nginx.conf.backup.*

# Restaurar o mais recente
cp /etc/nginx/nginx.conf.backup.* /etc/nginx/nginx.conf

# Testar
nginx -t
```

### Opção 2: Corrigir Manualmente

**1. Ver o erro completo:**

```bash
nginx -t
```

**2. Editar o arquivo:**

```bash
nano /etc/nginx/nginx.conf
```

**3. Procurar por problemas comuns:**

- Linhas com `{` sem fechar
- `map` fora do bloco `http {`
- Caracteres especiais ou espaços incorretos

**4. Adicionar o map CORRETAMENTE:**

O `map` deve estar **dentro** do bloco `http {`, assim:

```nginx
http {
    # Map para WebSocket upgrade (ADICIONAR AQUI)
    map $http_upgrade $connection_upgrade {
        default upgrade;
        ''      close;
    }
    
    # ... resto das configurações ...
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
```

**5. Testar:**

```bash
nginx -t
```

**6. Se OK, recarregar:**

```bash
systemctl reload nginx
```

---

## 🔍 Verificar Estrutura Correta

O `nginx.conf` deve ter esta estrutura:

```nginx
user www-data;
worker_processes auto;
pid /run/nginx.pid;

events {
    worker_connections 768;
}

http {
    # Map para WebSocket (AQUI!)
    map $http_upgrade $connection_upgrade {
        default upgrade;
        ''      close;
    }
    
    # ... outras configurações ...
    include /etc/nginx/mime.types;
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
```

---

## 🆘 Se Não Conseguir Corrigir

**1. Ver estrutura atual:**

```bash
cat /etc/nginx/nginx.conf | head -30
```

**2. Ver erro completo:**

```bash
nginx -t 2>&1 | head -20
```

**3. Restaurar do backup do sistema (se existir):**

```bash
# Ubuntu/Debian geralmente tem backup
cp /etc/nginx/nginx.conf.default /etc/nginx/nginx.conf
# OU
apt install --reinstall nginx
```

---

## ✅ Após Corrigir

**1. Testar:**

```bash
nginx -t
```

**2. Verificar map:**

```bash
nginx -T | grep -A 3 "map.*upgrade"
```

**3. Recarregar:**

```bash
systemctl reload nginx
```

---

**Última atualização:** 2024
