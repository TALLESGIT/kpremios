# 🔄 Reinstalar Backend na VPS - Passo a Passo

Este guia mostra como limpar completamente e reinstalar o backend na VPS.

## ⚠️ ATENÇÃO

Este processo vai:
- ✅ Fazer backup automático dos arquivos atuais
- ❌ Parar e deletar o processo PM2
- ❌ Limpar todos os arquivos do diretório do backend
- ✅ Reinstalar tudo do zero

---

## 🚀 Opção 1: Script Automatizado (Recomendado)

### No PowerShell do seu PC:

```powershell
cd C:\ZKPremiosRaffleApplication
.\reinstalar-backend-vps.ps1
```

O script vai fazer tudo automaticamente!

---

## 📝 Opção 2: Manual (Passo a Passo)

### PASSO 1: Conectar na VPS

```powershell
ssh root@76.13.82.48
```

### PASSO 2: Fazer Backup

```bash
# Na VPS
cd /var/www
tar -czf zkpremios-backend-backup-$(date +%Y%m%d_%H%M%S).tar.gz zkpremios-backend
ls -lh zkpremios-backend-backup-*.tar.gz
```

### PASSO 3: Parar e Deletar PM2

```bash
# Na VPS
pm2 stop zkpremios-socket
pm2 delete zkpremios-socket
pm2 save
pm2 list  # Deve estar vazio
```

### PASSO 4: Limpar Diretório

```bash
# Na VPS
cd /var/www/zkpremios-backend
rm -rf *
rm -rf .* 2>/dev/null  # Remove arquivos ocultos (exceto . e ..)
ls -la  # Deve estar vazio (só . e ..)
```

### PASSO 5: Enviar Arquivos Novos (do seu PC)

**Abra uma NOVA janela do PowerShell** (mantenha a SSH aberta) e execute:

```powershell
cd C:\ZKPremiosRaffleApplication
scp -r backend\socket-server\* root@76.13.82.48:/var/www/zkpremios-backend/
```

### PASSO 6: Verificar Arquivos Enviados (na VPS)

```bash
# Na VPS
cd /var/www/zkpremios-backend
ls -la
# Deve mostrar: server.js, package.json, etc.
```

### PASSO 7: Recriar Arquivo .env (na VPS)

```bash
# Na VPS
cd /var/www/zkpremios-backend
nano .env
```

Cole este conteúdo (ajuste com suas credenciais):

```env
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://www.zkoficial.com.br,https://zkoficial.com.br
SUPABASE_URL=https://bukigyhhgrtgryklabjg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1a2lneWhoZ3J0Z3J5a2xhYmpnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0OTk1NywiZXhwIjoyMDcyOTI1OTU3fQ.G41qsBF6Spd5-ZkHqhtAtkzrds5EcORtpgwz1-8PoZQ
```

Salve: `Ctrl+O`, `Enter`, `Ctrl+X`

### PASSO 8: Instalar Dependências (na VPS)

```bash
# Na VPS
cd /var/www/zkpremios-backend
npm install
```

### PASSO 9: Iniciar Servidor (na VPS)

```bash
# Na VPS
cd /var/www/zkpremios-backend
pm2 start server.js --name zkpremios-socket
pm2 save
pm2 list
```

### PASSO 10: Verificar Logs (na VPS)

```bash
# Na VPS
pm2 logs zkpremios-socket --lines 30 --nostream
```

**Deve mostrar:**
```
🚀 Socket.io Server iniciado!
📡 Porta: 3001
✅ Pronto para receber conexões WebSocket
```

**NÃO deve mostrar:**
```
❌ ReferenceError: Cannot access 'app' before initialization
```

### PASSO 11: Testar Health Check (na VPS)

```bash
# Na VPS
curl http://localhost:3001/health
```

**Deve retornar JSON com `"status": "healthy"`**

---

## ✅ Verificação Final

### Status do PM2 deve mostrar:
```
┌────┬────────────────────┬──────────┬──────┬───────────┬──────────┬──────────┐
│ id │ name               │ mode     │ ↺    │ status    │ cpu      │ memory   │
├────┼────────────────────┼──────────┼──────┼───────────┼──────────┼──────────┤
│ 0  │ zkpremios-socket   │ fork     │ 0    │ online    │ 0%       │ XXmb     │
└────┴────────────────────┴──────────┴──────┴───────────┴──────────┴──────────┘
```

**Status deve ser `online` (não `errored`).**

---

## 🆘 Se Der Erro

### Erro: "Cannot access 'app' before initialization"
- ✅ Arquivo `server.js` não foi atualizado corretamente
- ✅ Verifique se o arquivo local está correto
- ✅ Reenvie o arquivo: `scp backend\socket-server\server.js root@76.13.82.48:/var/www/zkpremios-backend/`

### Erro: "Module not found"
- ✅ Execute: `npm install` novamente

### Erro: ".env não encontrado"
- ✅ Crie o arquivo `.env` conforme PASSO 7

---

## 📦 Restaurar Backup (se necessário)

Se precisar restaurar o backup:

```bash
# Na VPS
cd /var/www
tar -xzf zkpremios-backend-backup-YYYYMMDD_HHMMSS.tar.gz
cd zkpremios-backend
pm2 start server.js --name zkpremios-socket
```

---

**Última atualização:** 2024
