# 🔍 DIAGNÓSTICO: Live Caindo

## 🎯 Problema Relatado
A live continua caindo mesmo com tudo no backend.

## 🔎 Possíveis Causas

### 1. **Erros de Autenticação Supabase** ✅ (JÁ CORRIGIDO)
- ❌ Erros `400: Invalid login credentials`
- ❌ Heartbeats falhando para usuários anônimos
- ✅ **Solução aplicada**: Tratamento de erro + migração Supabase

### 2. **Memória Insuficiente na VPS** ⚠️
**Sintomas:**
- PM2 reiniciando sozinho
- Status "errored" no PM2
- Logs com "Out of Memory" (OOM)

**Como verificar:**
```bash
ssh root@76.13.82.48 "free -h"
ssh root@76.13.82.48 "pm2 list"
```

**Solução:**
- Aumentar memória da VPS
- Limitar uso de memória do Node.js:
  ```bash
  pm2 delete zkpremios-socket
  pm2 start server.js --name zkpremios-socket --max-memory-restart 500M
  ```

### 3. **Token Agora.io Expirando** ⚠️
**Sintomas:**
- Live cai após X minutos
- Logs: "Token expirado" ou "token-privilege-did-expire"
- Viewers perdem conexão ao mesmo tempo

**Como verificar:**
- Verificar se o token tem tempo de expiração curto
- Logs do ZKViewer: `token-privilege-will-expire`

**Solução:**
- Gerar tokens com tempo maior (24h)
- Implementar renovação automática de token

### 4. **HLS Stream Parando** ⚠️
**Sintomas:**
- Vídeo congela
- Player mostra "Aguardando transmissão"
- Erro de rede no HLS

**Como verificar:**
```bash
# Testar se HLS está acessível
curl -I https://seu-hls-url.m3u8
```

**Solução:**
- Verificar se o ZK Studio está rodando
- Verificar conexão de internet do broadcaster
- Verificar se o servidor HLS está ativo

### 5. **Conexões WebSocket Excessivas** ⚠️
**Sintomas:**
- Backend lento
- Muitas conexões abertas
- CPU alta

**Como verificar:**
```bash
ssh root@76.13.82.48 "netstat -an | grep :3001 | wc -l"
```

**Solução:**
- Limitar conexões por IP
- Implementar rate limiting
- Aumentar recursos da VPS

### 6. **Disco Cheio** ⚠️
**Sintomas:**
- Logs param de ser escritos
- PM2 não consegue reiniciar
- Erros de escrita

**Como verificar:**
```bash
ssh root@76.13.82.48 "df -h"
```

**Solução:**
```bash
# Limpar logs antigos do PM2
pm2 flush
# Limpar logs do sistema
journalctl --vacuum-time=7d
```

### 7. **Nginx Timeout** ⚠️
**Sintomas:**
- Conexão cai após 60 segundos
- Erro 504 Gateway Timeout

**Como verificar:**
```bash
ssh root@76.13.82.48 "cat /etc/nginx/sites-available/default | grep timeout"
```

**Solução:**
Adicionar no Nginx:
```nginx
location /socket.io/ {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    
    # ✅ TIMEOUTS AUMENTADOS
    proxy_connect_timeout 7200s;
    proxy_send_timeout 7200s;
    proxy_read_timeout 7200s;
    send_timeout 7200s;
}
```

## 🚀 Passo a Passo para Diagnosticar

### 1. Execute o script de diagnóstico:
```powershell
.\diagnosticar-vps.ps1
```

### 2. Analise os resultados:
- ✅ PM2 status = "online" (bom)
- ❌ PM2 status = "errored" (problema!)
- ✅ Memória < 80% (bom)
- ❌ Memória > 90% (problema!)
- ✅ Disco < 80% (bom)
- ❌ Disco > 90% (problema!)

### 3. Verifique os logs em tempo real:
```bash
ssh root@76.13.82.48
pm2 logs zkpremios-socket --lines 100
```

### 4. Durante uma live, monitore:
```bash
# Terminal 1: Logs
pm2 logs zkpremios-socket

# Terminal 2: Recursos
watch -n 2 'free -h && echo "" && pm2 list'
```

## 📋 Checklist de Verificação

- [ ] PM2 está "online"?
- [ ] Memória < 80%?
- [ ] Disco < 80%?
- [ ] Sem erros 400 nos logs?
- [ ] Sem "Out of Memory" nos logs?
- [ ] Token Agora.io não expira?
- [ ] HLS URL acessível?
- [ ] Nginx configurado corretamente?
- [ ] ZK Studio conectado?

## 🆘 Próximos Passos

1. **Execute**: `.\diagnosticar-vps.ps1`
2. **Copie os logs** que aparecerem
3. **Me envie** para análise
4. Vou identificar a causa exata e corrigir!
