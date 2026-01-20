# 🚀 DEPLOY BACKEND SOCKET.IO NA VPS HOSTGATOR

## 📋 PRÉ-REQUISITOS

1. ✅ VPS HostGator configurada e acessível via SSH
2. ✅ Backend Socket.io funcionando localmente
3. ✅ IP/Domínio da VPS configurado
4. ✅ Acesso SSH à VPS

---

## 🔧 PASSO 1: PREPARAR BACKEND LOCALMENTE

### 1.1 Verificar se está funcionando localmente:

```bash
cd backend/socket-server
npm install
npm run dev  # Testar localmente primeiro
```

### 1.2 Configurar `.env` com valores de produção:

```bash
cp env.example .env
nano .env
```

Configure o `.env`:

```env
PORT=3001
FRONTEND_URL=https://www.zkoficial.com.br,https://zkoficial.com.br

SUPABASE_URL=https://bukigyhhgrtgryklabjg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui

# Opcional: Redis (para escalar horizontalmente depois)
# REDIS_URL=redis://localhost:6379
```

**⚠️ IMPORTANTE:**
- Use `SUPABASE_SERVICE_ROLE_KEY` (não `ANON_KEY`) no backend
- Configure `FRONTEND_URL` com o domínio real do seu site
- Porta `3001` pode ser alterada se necessário

---

## 📦 PASSO 2: ENVIAR ARQUIVOS PARA VPS

### 2.1 Compactar pasta do backend:

```bash
# No seu computador, na raiz do projeto
cd backend
tar -czf socket-server.tar.gz socket-server/
```

### 2.2 Enviar para VPS via SCP:

```bash
# Windows (PowerShell ou Git Bash)
scp socket-server.tar.gz usuario@IP-DA-VPS:/home/usuario/

# Substitua:
# - usuario: seu usuário SSH na VPS
# - IP-DA-VPS: IP ou domínio da VPS (ex: seu-site.com.br ou 123.456.789.10)
```

**Exemplo:**
```bash
scp socket-server.tar.gz root@123.456.789.10:/home/root/
```

---

## 🖥️ PASSO 3: CONFIGURAR VPS (HostGator)

### 3.1 Conectar via SSH:

```bash
ssh usuario@IP-DA-VPS
```

### 3.2 Extrair arquivos:

```bash
cd /home/usuario  # ou onde você enviou o arquivo
tar -xzf socket-server.tar.gz
cd socket-server
```

### 3.3 Instalar Node.js 18+ (se ainda não tiver):

```bash
# Verificar versão atual
node --version

# Se não tiver Node.js ou versão < 18, instalar:
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalação
node --version  # Deve mostrar v18.x.x ou superior
npm --version
```

### 3.4 Instalar dependências:

```bash
cd socket-server
npm install --production  # Instala apenas dependências de produção
```

### 3.5 Configurar variáveis de ambiente:

```bash
# Copiar exemplo
cp env.example .env

# Editar com nano
nano .env
```

Cole suas variáveis de ambiente (mesmas do passo 1.2):

```env
PORT=3001
FRONTEND_URL=https://www.zkoficial.com.br,https://zkoficial.com.br

SUPABASE_URL=https://bukigyhhgrtgryklabjg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui
```

Salve com `Ctrl+O`, Enter, `Ctrl+X`

---

## 🚀 PASSO 4: INICIAR SERVIDOR COM PM2

### 4.1 Instalar PM2 (gerenciador de processos):

```bash
npm install -g pm2
```

### 4.2 Iniciar servidor:

```bash
# Na pasta socket-server
pm2 start server.js --name socket-server
```

### 4.3 Verificar status:

```bash
pm2 status
pm2 logs socket-server  # Ver logs
```

### 4.4 Configurar PM2 para iniciar automaticamente:

```bash
# Salvar configuração atual
pm2 save

# Configurar para iniciar no boot
pm2 startup

# Siga as instruções que aparecerem (provavelmente precisará rodar um comando sudo)
```

---

## 🔒 PASSO 5: CONFIGURAR FIREWALL E PORTA

### 5.1 Abrir porta 3001 no firewall (se necessário):

```bash
# UFW (Ubuntu/Debian)
sudo ufw allow 3001/tcp
sudo ufw reload

# FirewallD (CentOS/RHEL)
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --reload
```

### 5.2 Verificar se porta está acessível:

```bash
# Na VPS
netstat -tulpn | grep 3001

# No seu computador (testar conexão)
telnet IP-DA-VPS 3001
# ou
curl http://IP-DA-VPS:3001
```

---

## 🌐 PASSO 6: CONFIGURAR DOMÍNIO (OPCIONAL)

### 6.1 Usar Nginx como reverse proxy (recomendado):

Instalar Nginx:

```bash
sudo apt-get update
sudo apt-get install nginx -y
```

Configurar Nginx:

```bash
sudo nano /etc/nginx/sites-available/socket-server
```

Cole esta configuração:

```nginx
server {
    listen 80;
    server_name socket.zkoficial.com.br;  # Subdomínio para Socket.io

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Ativar configuração:

```bash
sudo ln -s /etc/nginx/sites-available/socket-server /etc/nginx/sites-enabled/
sudo nginx -t  # Testar configuração
sudo systemctl restart nginx
```

### 6.2 Configurar DNS:

No painel do HostGator, adicione um registro A:

```
Tipo: A
Nome: socket (ou subdomínio que preferir)
Valor: IP-DA-VPS
TTL: 3600
```

### 6.3 Configurar SSL (HTTPS) com Let's Encrypt:

```bash
sudo apt-get install certbot python3-certbot-nginx -y
sudo certbot --nginx -d socket.zkoficial.com.br
```

---

## 📝 PASSO 7: ATUALIZAR FRONTEND (Vercel)

### 7.1 Atualizar variável de ambiente no Vercel:

No painel do Vercel → Settings → Environment Variables:

```
VITE_SOCKET_SERVER_URL=https://socket.zkoficial.com.br
```

**OU se não usar domínio:**

```
VITE_SOCKET_SERVER_URL=http://IP-DA-VPS:3001
```

### 7.2 Fazer novo deploy no Vercel:

```bash
git add .
git commit -m "Atualizar Socket.io server URL"
git push
```

---

## ✅ PASSO 8: TESTAR

### 8.1 Verificar se backend está rodando:

```bash
# Na VPS
pm2 logs socket-server  # Ver logs em tempo real

# Testar endpoint
curl http://localhost:3001/health
```

### 8.2 Testar do frontend:

1. Abra o site em produção (`https://www.zkoficial.com.br`)
2. Abra o Console do navegador (F12)
3. Procure por logs: `✅ useSocket: Conectado`
4. Envie uma mensagem no chat
5. Verifique se aparece para outros usuários

### 8.3 Verificar logs em tempo real:

```bash
# Na VPS
pm2 logs socket-server --lines 50
```

Procure por:
- `✅ Viewer conectado`
- `💬 Mensagem enviada na stream`
- `📡 Mensagem atualizada broadcast`

---

## 🔧 COMANDOS ÚTEIS PM2

```bash
# Ver status
pm2 status

# Ver logs
pm2 logs socket-server
pm2 logs socket-server --lines 100  # Últimas 100 linhas

# Reiniciar servidor
pm2 restart socket-server

# Parar servidor
pm2 stop socket-server

# Remover servidor do PM2
pm2 delete socket-server

# Monitorar recursos (CPU, RAM)
pm2 monit
```

---

## 🐛 TROUBLESHOOTING

### Problema: Servidor não inicia

```bash
# Ver logs de erro
pm2 logs socket-server --err

# Verificar se porta está em uso
sudo lsof -i :3001

# Verificar variáveis de ambiente
pm2 env 0  # 0 é o ID do processo
```

### Problema: CORS bloqueando conexão

Verifique se `FRONTEND_URL` no `.env` está correto:

```bash
nano .env
# Certifique-se que está: https://www.zkoficial.com.br,https://zkoficial.com.br
pm2 restart socket-server
```

### Problema: Não conecta ao Supabase

Verifique se `SUPABASE_SERVICE_ROLE_KEY` está configurado:

```bash
nano .env
# Certifique-se que SUPABASE_SERVICE_ROLE_KEY está correto
pm2 restart socket-server
```

### Problema: Porta não acessível

```bash
# Verificar firewall
sudo ufw status

# Testar localmente na VPS
curl http://localhost:3001

# Se funcionar localmente mas não externamente, verificar firewall da VPS
```

---

## 📊 MONITORAMENTO

### Ver estatísticas:

```bash
pm2 status
pm2 monit
```

### Ver uso de recursos:

```bash
pm2 info socket-server
```

### Ver logs de acesso:

```bash
pm2 logs socket-server
```

---

## 🔄 ATUALIZAR BACKEND

Quando precisar atualizar o código:

```bash
# Na VPS
cd /home/usuario/socket-server

# Puxar atualizações (se usar Git)
git pull

# OU reenviar arquivos atualizados via SCP (do seu computador)
# No seu computador:
cd backend
tar -czf socket-server.tar.gz socket-server/
scp socket-server.tar.gz usuario@IP-DA-VPS:/home/usuario/
# Na VPS:
tar -xzf socket-server.tar.gz
cd socket-server
npm install --production

# Reiniciar servidor
pm2 restart socket-server
```

---

## ✅ CHECKLIST FINAL

- [ ] Node.js 18+ instalado na VPS
- [ ] Backend Socket.io enviado para VPS
- [ ] Dependências instaladas (`npm install`)
- [ ] Arquivo `.env` configurado com valores corretos
- [ ] Servidor rodando com PM2
- [ ] PM2 configurado para iniciar no boot
- [ ] Porta 3001 aberta no firewall
- [ ] Nginx configurado (se usar domínio)
- [ ] DNS configurado (se usar domínio)
- [ ] SSL configurado (se usar HTTPS)
- [ ] Frontend atualizado com `VITE_SOCKET_SERVER_URL`
- [ ] Testado envio/recebimento de mensagens

---

## 🎯 PRÓXIMOS PASSOS

1. **Testar com alguns usuários** para garantir que está funcionando
2. **Monitorar logs** nas primeiras horas para verificar erros
3. **Configurar Redis** (opcional) se precisar escalar horizontalmente
4. **Configurar backup** do código na VPS
5. **Configurar alertas** (opcional) para monitorar downtime

---

**🎉 Pronto! Seu backend Socket.io está rodando na VPS!**
