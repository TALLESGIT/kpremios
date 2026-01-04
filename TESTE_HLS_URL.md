# 🧪 TESTE - Verificar se HLS está disponível

## ✅ ZK Studio está funcionando

Pelos logs, o ZK Studio está:
- ✅ Conectado ao LiveKit Cloud
- ✅ Publicação Ativa
- ✅ Gerando frames (Frame 60, 120, 180, 240)
- ✅ Supabase sincronizado

## 🔍 PRÓXIMO PASSO: Verificar HLS

O problema agora é verificar se o **HLS está disponível no LiveKit**.

### Teste 1: Verificar URL HLS no navegador

Abra esta URL no navegador:
```
https://zkoficial-6xokn1hv.livekit.cloud/hls/ZkPremios/index.m3u8
```

**Esperado:**
- Se funcionar: Você verá um arquivo de texto com conteúdo `.m3u8` (playlist HLS)
- Se não funcionar: Erro 404 ou 403

### Teste 2: Verificar no console do site

No console do navegador (F12), procure por:
```
🔄 LivePlayer: Carregando HLS: https://zkoficial-6xokn1hv.livekit.cloud/hls/ZkPremios/index.m3u8
```

E depois:
```
✅ LivePlayer: Vídeo pronto para reproduzir
```

OU:
```
❌ LivePlayer: Erro no vídeo: ...
```

### Teste 3: Verificar Network tab

No DevTools → Network tab:
1. Filtre por "m3u8" ou "ts"
2. Procure por requisições para:
   - `index.m3u8` (playlist)
   - `*.ts` (segmentos de vídeo)

**Se aparecer requisições:**
- O player está tentando carregar ✅
- Verifique o status (200 = OK, 404 = não encontrado)

**Se não aparecer requisições:**
- O player não está tentando carregar ❌
- Verifique se a URL está correta no Supabase

## ⏰ IMPORTANTE: Aguardar HLS

O LiveKit pode levar **30-60 segundos** para gerar o HLS após a transmissão começar.

**Aguarde pelo menos 1 minuto** após o ZK Studio iniciar a transmissão antes de verificar.

## 🔧 Se o HLS não estiver disponível

### Possível causa 1: HLS não habilitado no LiveKit

1. Acesse o dashboard do LiveKit Cloud
2. Vá em **Settings** → **HLS**
3. Verifique se HLS está **habilitado**
4. Se não estiver, habilite e salve

### Possível causa 2: Room não existe

O room `ZkPremios` precisa existir no LiveKit. Normalmente é criado automaticamente quando o ZK Studio conecta, mas verifique no dashboard.

### Possível causa 3: URL incorreta

Verifique se a URL no Supabase está correta:
```sql
SELECT hls_url FROM live_streams WHERE is_active = true;
```

**URL esperada:**
```
https://zkoficial-6xokn1hv.livekit.cloud/hls/ZkPremios/index.m3u8
```

## 📋 CHECKLIST

- [ ] ZK Studio está transmitindo (✅ confirmado pelos logs)
- [ ] Aguardou 30-60 segundos após iniciar
- [ ] Testou URL HLS no navegador
- [ ] Verificou console do navegador
- [ ] Verificou Network tab
- [ ] HLS está habilitado no LiveKit Cloud
- [ ] URL está correta no Supabase

## 🎯 RESULTADO ESPERADO

Após aguardar 30-60 segundos:
1. URL HLS deve retornar conteúdo `.m3u8`
2. Console deve mostrar `✅ Vídeo pronto para reproduzir`
3. Network tab deve mostrar requisições para `.ts` (segmentos)
4. Vídeo deve aparecer no site

**Se ainda não funcionar após 1 minuto, o problema é no LiveKit ou na configuração do HLS.**

