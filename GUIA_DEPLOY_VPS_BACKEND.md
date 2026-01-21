# 🚀 Guia de Deploy - Backend Socket.io na Hostinger VPS

## 📋 Pré-requisitos

- VPS Hostinger com Ubuntu/Debian
- Acesso SSH (root ou sudo)
- Domínio apontando para o IP da VPS (ex: `api.zkpremios.com`)

---

## 1️⃣ Conectar na VPS via SSH

```bash
ssh root@SEU_IP_DA_VPS
# Ou se tiver usuário específico:
ssh usuario@SEU_IP_DA_VPS
```

---

## 2️⃣ Atualizar Sistema

```bash
sudo apt update && sudo apt upgrade -y
```

---

## 3️⃣ Instalar Node.js (v20 LTS)

```bash
# Adicionar repositório NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Instalar Node.js
sudo apt install -y nodejs

# Verificar instalação
node -v
npm -v
```

---

## 4️⃣ Instalar PM2 (Process Manager)

```bash
sudo npm install -g pm2

# Verificar instalação
pm2 -v
```

---

## 5️⃣ Criar Diretório do Projeto

```bash
# Criar pasta para o projeto
sudo mkdir -p /var/www/zkpremios-backend
cd /var/www/zkpremios-backend

# Dar permissões ao usuário atual
sudo chown -R $USER:$USER /var/www/zkpremios-backend
```

---

## 6️⃣ Enviar Código do Backend

### Opção A: Via Git (Recomendado)

```bash
# Se você tiver um repositório Git
git clone https://github.com/SEU_USUARIO/SEU_REPO.git .

# Ou apenas o backend
git clone https://github.com/SEU_USUARIO/SEU_REPO.git temp
mv temp/backend/socket-server/* .
rm -rf temp
```

### Opção B: Via SCP (do seu PC)

```bash
# No seu PC (PowerShell), na pasta do projeto:
scp -r C:\ZKPremiosRaffleApplication\backend\socket-server\* root@SEU_IP:/var/www/zkpremios-backend/
```

### Opção C: Via FTP/SFTP

Use FileZilla ou WinSCP para enviar a pasta `backend/socket-server` para `/var/www/zkpremios-backend/`

---

## 7️⃣ Configurar Variáveis de Ambiente

```bash
cd /var/www/zkpremios-backend

# Criar arquivo .env
nano .env
```

**Conteúdo do `.env`**:

```env
# Porta do servidor
PORT=3001

# Supabase
SUPABASE_URL=https://SEU_PROJETO.supabase.co
SUPABASE_ANON_KEY=SUA_CHAVE_ANON_AQUI
SUPABASE_SERVICE_ROLE_KEY=SUA_CHAVE_SERVICE_ROLE_AQUI

# CORS (domínios permitidos)
ALLOWED_ORIGINS=https://zkpremios.com,https://www.zkpremios.com

# Ambiente
NODE_ENV=production
```

**Salvar**: `Ctrl + O`, `Enter`, `Ctrl + X`

---

## 8️⃣ Instalar Dependências

```bash
npm install --production
```

---

## 9️⃣ Iniciar com PM2

```bash
# Iniciar o servidor
pm2 start server.js --name zkpremios-socket

# Configurar para iniciar automaticamente no boot
pm2 startup
pm2 save

# Verificar status
pm2 status
pm2 logs zkpremios-socket
```

---

## 🔟 Instalar e Configurar Nginx

```bash
# Instalar Nginx
sudo apt install -y nginx

# Criar configuração do site
sudo nano /etc/nginx/sites-available/zkpremios-api
```

**Conteúdo do arquivo**:

```nginx
server {
    listen 80;
    server_name api.zkpremios.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        
        # Headers para WebSocket
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Headers adicionais
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts para WebSocket
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
```

**Salvar**: `Ctrl + O`, `Enter`, `Ctrl + X`

```bash
# Ativar site
sudo ln -s /etc/nginx/sites-available/zkpremios-api /etc/nginx/sites-enabled/

# Testar configuração
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

---

## 1️⃣1️⃣ Configurar SSL com Let's Encrypt

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obter certificado SSL
sudo certbot --nginx -d api.zkpremios.com

# Responder as perguntas:
# - Email: seu@email.com
# - Aceitar termos: Y
# - Compartilhar email: N (opcional)
# - Redirect HTTP para HTTPS: 2 (Sim)

# Testar renovação automática
sudo certbot renew --dry-run
```

---

## 🔧 Comandos Úteis PM2

```bash
# Ver logs em tempo real
pm2 logs zkpremios-socket

# Reiniciar servidor
pm2 restart zkpremios-socket

# Parar servidor
pm2 stop zkpremios-socket

# Remover do PM2
pm2 delete zkpremios-socket

# Ver status e uso de recursos
pm2 monit
```

---

## 🔥 Firewall (UFW)

```bash
# Habilitar firewall
sudo ufw enable

# Permitir SSH
sudo ufw allow 22

# Permitir HTTP e HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Verificar status
sudo ufw status
```

---

## ✅ Testar o Backend

### Teste 1: Verificar se está rodando

```bash
curl http://localhost:3001
# Deve retornar: Cannot GET /
```

### Teste 2: Verificar via domínio

```bash
curl https://api.zkpremios.com
# Deve retornar: Cannot GET /
```

### Teste 3: Testar Socket.io (do seu PC)

Abra o console do navegador em `https://zkpremios.com` e execute:

```javascript
const socket = io('https://api.zkpremios.com');
socket.on('connect', () => console.log('✅ Conectado!'));
socket.on('connect_error', (err) => console.error('❌ Erro:', err));
```

---

## 🔄 Atualizar o Backend

```bash
# Conectar na VPS
ssh root@SEU_IP

# Ir para a pasta do projeto
cd /var/www/zkpremios-backend

# Atualizar código (se usar Git)
git pull

# Ou enviar novos arquivos via SCP/FTP

# Reinstalar dependências (se package.json mudou)
npm install --production

# Reiniciar PM2
pm2 restart zkpremios-socket

# Ver logs
pm2 logs zkpremios-socket
```

---

## 🆘 Troubleshooting

### Problema: PM2 não inicia

```bash
# Ver logs de erro
pm2 logs zkpremios-socket --err

# Verificar se a porta 3001 está em uso
sudo lsof -i :3001

# Matar processo na porta 3001
sudo kill -9 $(sudo lsof -t -i:3001)
```

### Problema: Nginx não conecta ao backend

```bash
# Ver logs do Nginx
sudo tail -f /var/log/nginx/error.log

# Verificar se o backend está rodando
pm2 status

# Testar conexão local
curl http://localhost:3001
```

### Problema: SSL não funciona

```bash
# Verificar certificado
sudo certbot certificates

# Renovar manualmente
sudo certbot renew

# Ver logs do Certbot
sudo tail -f /var/log/letsencrypt/letsencrypt.log
```

---

## 📝 Checklist Final

- [ ] Node.js instalado (v20+)
- [ ] PM2 instalado e configurado
- [ ] Código do backend enviado para `/var/www/zkpremios-backend`
- [ ] Arquivo `.env` configurado com credenciais corretas
- [ ] Dependências instaladas (`npm install`)
- [ ] Backend rodando com PM2 (`pm2 status`)
- [ ] Nginx instalado e configurado
- [ ] Domínio apontando para o IP da VPS
- [ ] SSL configurado com Let's Encrypt
- [ ] Firewall configurado (UFW)
- [ ] Teste de conexão Socket.io funcionando

---

## 🎯 Próximos Passos

Depois de configurar o backend, você precisa atualizar o frontend:

1. Alterar `VITE_SOCKET_URL` no `.env` do frontend para `https://api.zkpremios.com`
2. Fazer build do frontend: `npm run build`
3. Fazer deploy do frontend (Vercel, Netlify, ou mesma VPS)

---

**Qualquer dúvida durante o processo, me avise que eu te ajudo! 🚀**
