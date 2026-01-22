# 🔄 Atualizar Backend na VPS

## Alterações Feitas

As seguintes alterações foram feitas no `backend/socket-server/server.js`:

1. ✅ Validação de login obrigatório para enviar mensagens
2. ✅ Flag `socketIoChatMessages` para evitar broadcast duplicado
3. ✅ Suporte para mensagens TTS via Socket.io (campos `tts_text` e `audio_duration`)

## 📋 Passo a Passo para Atualizar

### Opção 1: Via Git (Recomendado - Se usar Git)

```bash
# 1. Conectar na VPS via SSH
ssh usuario@IP-DA-VPS

# 2. Ir para a pasta do backend
cd /var/www/zkpremios-backend
# OU (dependendo de onde está instalado)
cd /home/usuario/socket-server

# 3. Puxar atualizações do GitHub
git pull origin master

# 4. Instalar novas dependências (se houver)
npm install --production

# 5. Reiniciar o servidor com PM2
pm2 restart socket-server
# OU (se o nome for diferente)
pm2 restart zkpremios-socket

# 6. Verificar se está rodando
pm2 status
pm2 logs socket-server --lines 50
```

### Opção 2: Via SCP (Enviar arquivo atualizado)

```bash
# 1. No seu computador (Windows PowerShell), na pasta do projeto:
cd C:\ZKPremiosRaffleApplication

# 2. Enviar apenas o arquivo server.js atualizado
scp backend/socket-server/server.js usuario@IP-DA-VPS:/var/www/zkpremios-backend/server.js
# OU
scp backend/socket-server/server.js usuario@IP-DA-VPS:/home/usuario/socket-server/server.js

# 3. Conectar na VPS
ssh usuario@IP-DA-VPS

# 4. Ir para a pasta do backend
cd /var/www/zkpremios-backend
# OU
cd /home/usuario/socket-server

# 5. Reiniciar o servidor
pm2 restart socket-server
# OU
pm2 restart zkpremios-socket

# 6. Verificar logs
pm2 logs socket-server --lines 50
```

### Opção 3: Via FTP/SFTP (FileZilla, WinSCP, etc.)

1. **Conectar na VPS via FTP/SFTP**
2. **Navegar até a pasta do backend:**
   - `/var/www/zkpremios-backend/`
   - OU `/home/usuario/socket-server/`
3. **Substituir o arquivo `server.js`** pelo arquivo atualizado
4. **Conectar via SSH e reiniciar:**
   ```bash
   ssh usuario@IP-DA-VPS
   cd /var/www/zkpremios-backend  # ou caminho correto
   pm2 restart socket-server
   pm2 logs socket-server --lines 50
   ```

## ✅ Verificar se Atualização Funcionou

```bash
# 1. Verificar status do PM2
pm2 status

# 2. Ver logs recentes
pm2 logs socket-server --lines 100

# 3. Testar endpoint de health
curl http://localhost:3001/health
# Deve retornar: {"status":"healthy","timestamp":"..."}

# 4. Verificar se o servidor está escutando
netstat -tulpn | grep 3001
# OU
ss -tulpn | grep 3001
```

## 🔍 Verificar Alterações no Código

Após atualizar, você pode verificar se as alterações estão presentes:

```bash
# Na VPS, verificar se a validação de userId está presente
grep -n "EXIGIR LOGIN" /var/www/zkpremios-backend/server.js
# OU
grep -n "EXIGIR LOGIN" /home/usuario/socket-server/server.js

# Deve mostrar a linha com a validação
```

## ⚠️ Importante

- **Não esqueça de reiniciar o PM2** após atualizar o arquivo
- **Verifique os logs** para garantir que não há erros
- **Teste o envio de mensagens** após a atualização
- **Se houver erro**, verifique os logs: `pm2 logs socket-server`

## 🚨 Se Algo Der Errado

```bash
# Parar o servidor
pm2 stop socket-server

# Ver logs de erro
pm2 logs socket-server --err

# Reiniciar
pm2 restart socket-server

# Se necessário, restaurar versão anterior
# (se você fez backup antes)
```

## 📝 Checklist

- [ ] Arquivo `server.js` atualizado na VPS
- [ ] PM2 reiniciado
- [ ] Logs verificados (sem erros)
- [ ] Teste de envio de mensagem funcionando
- [ ] Validação de login funcionando (usuário não logado não consegue enviar)
- [ ] Mensagens TTS VIP funcionando

---

**🎉 Pronto! Backend atualizado na VPS!**
