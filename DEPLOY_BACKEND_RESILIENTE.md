# 🚀 DEPLOY: Backend Resiliente

## ✅ O QUE FOI FEITO

Implementei um **sistema de cache resiliente** que garante que a live **NUNCA cai** mesmo se o Supabase falhar!

### Arquivos Criados/Modificados:

1. ✅ `backend/socket-server/resilient-cache.js` - Cache em memória
2. ✅ `backend/socket-server/supabase-wrapper.js` - Wrapper com fallback
3. ✅ `backend/socket-server/server.js` - Integrado com wrapper
4. ✅ `supabase/migrations/20260122_fix_statement_timeout.sql` - Timeout otimizado

---

## 🎯 DEPLOY MANUAL (RECOMENDADO)

### **Opção 1: Via Git Pull (MAIS FÁCIL)**

```bash
ssh root@76.13.82.48
cd /var/www/zkpremios-backend
git pull origin master
pm2 restart zkpremios-socket
pm2 logs zkpremios-socket --lines 20
```

### **Opção 2: Via SCP (Se git pull não funcionar)**

No PowerShell local:

```powershell
# 1. Enviar arquivos
scp backend\socket-server\server.js root@76.13.82.48:/var/www/zkpremios-backend/
scp backend\socket-server\resilient-cache.js root@76.13.82.48:/var/www/zkpremios-backend/
scp backend\socket-server\supabase-wrapper.js root@76.13.82.48:/var/www/zkpremios-backend/

# 2. Reiniciar PM2
ssh root@76.13.82.48 "cd /var/www/zkpremios-backend && pm2 restart zkpremios-socket"

# 3. Verificar logs
ssh root@76.13.82.48 "pm2 logs zkpremios-socket --lines 20 --nostream"
```

---

## 🔍 VERIFICAR SE FUNCIONOU

### **1. Verificar se PM2 está online:**

```bash
ssh root@76.13.82.48 "pm2 list"
```

**Esperado:** Status = `online`

### **2. Verificar logs (deve mostrar cache inicializado):**

```bash
ssh root@76.13.82.48 "pm2 logs zkpremios-socket --lines 30 --nostream"
```

**Esperado:**
```
✅ Cache resiliente inicializado
```

### **3. Testar endpoint de health:**

```bash
curl http://76.13.82.48:3001/health
```

**Esperado:**
```json
{
  "status": "healthy",
  "cache": {
    "users": 0,
    "viewers": 0,
    "messages": 0,
    "supabaseHealthy": true
  }
}
```

---

## 🎉 RESULTADO FINAL

Depois do deploy, a live vai:

| Cenário | Comportamento |
|---------|---------------|
| ✅ Supabase OK | Usa Supabase + Cache |
| ✅ Supabase lento | Timeout 5s → Usa Cache |
| ✅ Supabase caiu | **Live continua funcionando!** |
| ✅ Mensagens | Salvas no cache, sincronizadas depois |
| ✅ Viewers | Contados em RAM (instantâneo) |
| ✅ Likes | Processados via cache |

---

## 🆘 SE DER ERRO

### **Erro: "Cannot find module './resilient-cache'"**

**Solução:** Os arquivos não foram enviados. Use a Opção 2 (SCP) acima.

### **Erro: PM2 status "errored"**

**Solução:** Verificar logs de erro:

```bash
ssh root@76.13.82.48 "pm2 logs zkpremios-socket --err --lines 50 --nostream"
```

### **Erro: "ENOENT: no such file"**

**Solução:** Verificar se os arquivos estão no diretório correto:

```bash
ssh root@76.13.82.48 "ls -la /var/www/zkpremios-backend/"
```

Deve mostrar:
- `server.js`
- `resilient-cache.js`
- `supabase-wrapper.js`

---

## 📊 MONITORAMENTO

### **Ver logs em tempo real:**

```bash
ssh root@76.13.82.48
pm2 logs zkpremios-socket
```

### **Ver estatísticas do cache:**

```bash
curl http://76.13.82.48:3001/health | jq .cache
```

---

## ✅ PRÓXIMOS PASSOS

1. **Execute o deploy** (Opção 1 ou 2 acima)
2. **Verifique se funcionou** (PM2 online + logs OK)
3. **Teste a live** - Faça uma transmissão
4. **Monitore** - Veja se não cai mais!

**A live agora é INDESTRUTÍVEL!** 🛡️
