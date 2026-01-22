# 🚀 Passo a Passo - Deploy Backend via PowerShell

## 📋 Informações Necessárias

Antes de começar, você precisa ter:
- ✅ IP da VPS
- ✅ Usuário SSH (geralmente `root` ou seu usuário)
- ✅ Caminho onde o backend está instalado na VPS
- ✅ Nome do processo no PM2 (geralmente `socket-server` ou `zkpremios-socket`)

---

## 🔧 PASSO 1: Abrir PowerShell

1. Pressione `Win + X` e escolha **"Windows PowerShell"** ou **"Terminal"**
2. Navegue até a pasta do projeto:
   ```powershell
   cd C:\ZKPremiosRaffleApplication
   ```

---

## 📤 PASSO 2: Enviar Arquivo para VPS

Execute este comando (substitua com seus dados):

```powershell
scp backend\socket-server\server.js usuario@IP-DA-VPS:/caminho/do/backend/server.js
```

**Exemplo real:**
```powershell
# Se seu backend está em /var/www/zkpremios-backend
scp backend\socket-server\server.js root@192.168.1.100:/var/www/zkpremios-backend/server.js

# OU se está em /home/usuario/socket-server
scp backend\socket-server\server.js root@192.168.1.100:/home/usuario/socket-server/server.js
```

**O que vai acontecer:**
- Vai pedir sua senha SSH (ou usar chave se configurada)
- O arquivo será enviado para a VPS

---

## 🔄 PASSO 3: Conectar na VPS e Reiniciar

Execute este comando:

```powershell
ssh usuario@IP-DA-VPS "cd /caminho/do/backend && pm2 restart socket-server"
```

**Exemplo real:**
```powershell
# Se seu backend está em /var/www/zkpremios-backend
ssh root@192.168.1.100 "cd /var/www/zkpremios-backend && pm2 restart socket-server"

# OU se o nome do PM2 for diferente
ssh root@192.168.1.100 "cd /var/www/zkpremios-backend && pm2 restart zkpremios-socket"
```

**O que vai acontecer:**
- Vai conectar na VPS
- Vai para a pasta do backend
- Vai reiniciar o servidor com PM2

---

## ✅ PASSO 4: Verificar se Está Funcionando

Execute este comando para ver o status:

```powershell
ssh usuario@IP-DA-VPS "pm2 status socket-server"
```

**Você deve ver algo como:**
```
┌─────┬──────────────────┬─────────┬─────────┬──────────┐
│ id  │ name             │ status  │ restart │ uptime   │
├─────┼──────────────────┼─────────┼─────────┼──────────┤
│ 0   │ socket-server    │ online  │ 5       │ 2m       │
└─────┴──────────────────┴─────────┴─────────┴──────────┘
```

---

## 📝 PASSO 5: Ver Logs (Opcional)

Para ver os últimos logs e verificar se não há erros:

```powershell
ssh usuario@IP-DA-VPS "pm2 logs socket-server --lines 50 --nostream"
```

**O que procurar:**
- ✅ `✅ Viewer conectado` - Conexões funcionando
- ✅ `🚀 Socket.io Server iniciado!` - Servidor iniciado
- ❌ Se aparecer erros, anote e me avise

---

## 🎯 Comandos Completos (Copiar e Colar)

Substitua as variáveis e execute na ordem:

```powershell
# 1. Ir para a pasta do projeto
cd C:\ZKPremiosRaffleApplication

# 2. Enviar arquivo (AJUSTE: usuario, IP e caminho)
scp backend\socket-server\server.js root@SEU_IP:/var/www/zkpremios-backend/server.js

# 3. Reiniciar servidor (AJUSTE: usuario, IP, caminho e nome do PM2)
ssh root@SEU_IP "cd /var/www/zkpremios-backend && pm2 restart socket-server"

# 4. Verificar status
ssh root@SEU_IP "pm2 status socket-server"

# 5. Ver logs
ssh root@SEU_IP "pm2 logs socket-server --lines 50 --nostream"
```

---

## ⚠️ Problemas Comuns

### Erro: "scp: command not found"
**Solução:** Use o caminho completo ou instale OpenSSH:
```powershell
# Windows 10/11 geralmente já tem, mas se não tiver:
Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0
```

### Erro: "Permission denied"
**Solução:** Verifique se o usuário tem permissão na pasta:
```powershell
ssh usuario@IP "ls -la /caminho/do/backend"
```

### Erro: "pm2: command not found"
**Solução:** O PM2 não está no PATH. Use o caminho completo ou instale:
```powershell
ssh usuario@IP "npm install -g pm2"
```

### Erro: "Connection refused" ou "Connection timed out"
**Solução:** 
- Verifique se o IP está correto
- Verifique se a porta 22 (SSH) está aberta
- Verifique se o firewall da VPS permite conexões SSH

---

## 🎉 Pronto!

Após executar todos os passos, seu backend estará atualizado na VPS!

**Para testar:**
1. Acesse seu site
2. Tente enviar uma mensagem no chat
3. Verifique se está funcionando

---

## 💡 Dica: Criar Alias (Opcional)

Para facilitar no futuro, você pode criar aliases no PowerShell:

```powershell
# Adicionar ao seu perfil PowerShell
notepad $PROFILE

# Adicionar estas linhas (ajuste com seus dados):
function Deploy-Backend {
    scp backend\socket-server\server.js root@SEU_IP:/var/www/zkpremios-backend/server.js
    ssh root@SEU_IP "cd /var/www/zkpremios-backend && pm2 restart socket-server"
    ssh root@SEU_IP "pm2 logs socket-server --lines 20 --nostream"
}

# Depois, salve e execute:
. $PROFILE

# Agora você pode usar apenas:
Deploy-Backend
```
