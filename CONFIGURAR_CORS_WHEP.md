# CORS para WHEP - Corrigir "Access-Control-Allow-Origin: Cabeçalho em falta"

## Problema

O WhepPlayer faz `fetch` para `https://stream.zkoficial.com.br/webrtc/live/ZkOficial/whep` a partir do frontend (ex: zkoficial.com.br ou Vercel). O browser bloqueia por CORS:

```
A cross-origin resource sharing (CORS) request was blocked because of invalid or missing response headers
Access-Control-Allow-Origin: Cabeçalho em falta
```

## Solução

O **servidor** (Nginx que faz proxy para o MediaMTX) precisa adicionar os headers CORS na resposta.

### 1. Usar a config pronta

O arquivo `nginx-stream.zkoficial.com.br.conf` já inclui CORS. Se você ainda não tem config para stream.zkoficial.com.br:

```bash
# Na VPS
sudo cp nginx-stream.zkoficial.com.br.conf /etc/nginx/sites-available/stream.zkoficial.com.br
sudo ln -sf /etc/nginx/sites-available/stream.zkoficial.com.br /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 2. Se já tem config para stream.zkoficial.com.br

Adicione dentro do `location /` (ou do location que faz proxy para o MediaMTX):

```nginx
# Preflight OPTIONS
if ($request_method = 'OPTIONS') {
    add_header 'Access-Control-Allow-Origin' '*';
    add_header 'Access-Control-Allow-Methods' 'POST, OPTIONS';
    add_header 'Access-Control-Allow-Headers' 'Content-Type';
    add_header 'Access-Control-Max-Age' 86400;
    add_header 'Content-Length' 0;
    add_header 'Content-Type' 'text/plain';
    return 204;
}

# Nas respostas normais (após proxy_pass)
add_header 'Access-Control-Allow-Origin' '*' always;
add_header 'Access-Control-Allow-Methods' 'POST, OPTIONS' always;
add_header 'Access-Control-Allow-Headers' 'Content-Type' always;
```

### 3. Verificar

Após aplicar, o WhepPlayer deve conectar sem erro de CORS. No DevTools (Network), a resposta do WHEP deve ter `Access-Control-Allow-Origin: *`.
