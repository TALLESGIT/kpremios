# 📤 Atualizar server.js na VPS Hostinger

## 🎯 Passo a Passo Completo

### **PASSO 1: No seu PC (PowerShell)**

Abra o PowerShell na pasta do projeto (`C:\ZKPremiosRaffleApplication`) e execute:

```powershell
# Enviar arquivo corrigido para VPS
scp backend\socket-server\server.js root@76.13.82.48:/var/www/zkpremios-backend/server.js
```

**Você será solicitado a digitar a senha da VPS.**

---

### **PASSO 2: Na VPS (via SSH)**

Conecte na VPS:

```powershell
# No PowerShell do seu PC
ssh root@76.13.82.48
```

**Depois de conectar na VPS**, execute estes comandos **dentro da VPS**:

```bash
# 1. Ir para o diretório do backend
cd /var/www/zkpremios-backend

# 2. Fazer backup do arquivo atual (por segurança)
cp server.js server.js.backup.$(date +%Y%m%d_%H%M%S)

# 3. Verificar se o arquivo foi atualizado (verificar data/hora)
ls -lh server.js

# 4. Reiniciar o PM2
pm2 restart zkpremios-socket

# 5. Aguardar 3 segundos
sleep 3

# 6. Verificar status
pm2 list

# 7. Ver logs para confirmar que iniciou sem erros
pm2 logs zkpremios-socket --lines 20 --nostream
```

---

## 🔄 Alternativa: Tudo em um comando (do PC)

Se preferir fazer tudo do seu PC sem entrar na VPS manualmente:

```powershell
# 1. Enviar arquivo
scp backend\socket-server\server.js root@76.13.82.48:/var/www/zkpremios-backend/server.js

# 2. Fazer backup e reiniciar (tudo de uma vez)
ssh root@76.13.82.48 "cd /var/www/zkpremios-backend && cp server.js server.js.backup.\$(date +%Y%m%d_%H%M%S) && pm2 restart zkpremios-socket && sleep 3 && pm2 list"

# 3. Ver logs
ssh root@76.13.82.48 "pm2 logs zkpremios-socket --lines 20 --nostream"
```

---

## ✅ O que você deve ver após atualizar

### Status do PM2 deve mostrar:
```
┌────┬────────────────────┬──────────┬──────┬───────────┬──────────┬──────────┐
│ id │ name               │ mode     │ ↺    │ status    │ cpu      │ memory   │
├────┼────────────────────┼──────────┼──────┼───────────┼──────────┼──────────┤
│ 0  │ zkpremios-socket   │ fork     │ 0    │ online    │ 0%       │ XXmb     │
└────┴────────────────────┴──────────┴──────┴───────────┴──────────┴──────────┘
```

**Status deve ser `online` (não `errored`).**

### Logs devem mostrar:
```
📂 Backend CWD: /var/www/zkpremios-backend
📂 Backend Dirname: /var/www/zkpremios-backend
🌐 Frontend URL configurada: https://www.zkoficial.com.br,https://zkoficial.com.br
🔧 Ambiente: production
✅ Canal Realtime configurado...
🚀 Socket.io Server iniciado!
📡 Porta: 3001
✅ Pronto para receber conexões WebSocket
```

**NÃO deve aparecer:**
- ❌ `ReferenceError: Cannot access 'app' before initialization`
- ❌ `errored` no status do PM2

---

## 🆘 Se ainda der erro

Execute na VPS para ver o erro completo:

```bash
cd /var/www/zkpremios-backend
pm2 logs zkpremios-socket --err --lines 50 --nostream
```

E me envie a saída completa.

---

## 📝 Resumo Visual

```
┌─────────────────────────────────────────────────────────┐
│ SEU PC (PowerShell)                                      │
│                                                          │
│ 1. scp backend\socket-server\server.js ...              │
│    (envia arquivo para VPS)                             │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ VPS HOSTINGER (SSH)                                     │
│                                                          │
│ 2. cd /var/www/zkpremios-backend                        │
│ 3. cp server.js server.js.backup...                    │
│ 4. pm2 restart zkpremios-socket                        │
│ 5. pm2 list                                             │
│ 6. pm2 logs zkpremios-socket --lines 20                 │
└─────────────────────────────────────────────────────────┘
```

---

**Última atualização:** 2024
