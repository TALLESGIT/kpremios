# 🔍 DEBUG - Cenas do ZK Studio não aparecem no site

## ❌ PROBLEMA

ZK Studio está transmitindo para LiveKit, mas **nada aparece no site**:
- ❌ Imagens não aparecem
- ❌ Vídeos não aparecem  
- ❌ Webcam não aparece
- ❌ Compartilhamento de tela não aparece

## 🔍 POSSÍVEIS CAUSAS

### 1. HLS não está disponível no LiveKit

O LiveKit pode levar alguns segundos para gerar o HLS após a transmissão começar. Verifique:

```bash
# Testar se o HLS está disponível
curl -I https://zkoficial-6xokn1hv.livekit.cloud/hls/ZkPremios/index.m3u8
```

**Esperado:** `HTTP/2 200` ou `HTTP/2 404` (se ainda não estiver disponível)

### 2. URL HLS incorreta

Verifique se a URL está correta:
- **Esperada:** `https://zkoficial-6xokn1hv.livekit.cloud/hls/ZkPremios/index.m3u8`
- **Room:** `ZkPremios` (fixo, sempre o mesmo)

### 3. LiveKit não está gerando HLS

O LiveKit precisa ter HLS habilitado. Verifique:
- Configuração do LiveKit Cloud
- Se o HLS está habilitado para o projeto
- Se há algum erro nos logs do LiveKit

### 4. CORS ou permissões

O navegador pode estar bloqueando o HLS por CORS. Verifique no console:
- Erros de CORS
- Erros de rede
- Erros de mídia

### 5. ZK Studio não está publicando tracks

Verifique nos logs do ZK Studio:
- `[LiveKitService] 📡 Publicação Ativa` - confirma que está publicando
- Se há erros ao publicar tracks de vídeo/áudio

## ✅ TESTES PARA FAZER

### Teste 1: Verificar URL HLS diretamente

Abra no navegador:
```
https://zkoficial-6xokn1hv.livekit.cloud/hls/ZkPremios/index.m3u8
```

**Esperado:**
- Se o stream estiver ativo: arquivo `.m3u8` (playlist HLS)
- Se não estiver: erro 404 ou 403

### Teste 2: Verificar no console do navegador

Abra o DevTools (F12) e verifique:
1. **Network tab**: Procure por requisições para `index.m3u8` ou `.ts` (segmentos HLS)
2. **Console tab**: Procure por erros relacionados a:
   - `MEDIA_ERR_NETWORK`
   - `MEDIA_ERR_SRC_NOT_SUPPORTED`
   - `CORS`
   - `Failed to load resource`

### Teste 3: Verificar se o vídeo está tentando carregar

No console, procure por:
```
🔄 LivePlayer: Carregando HLS: https://zkoficial-6xokn1hv.livekit.cloud/hls/ZkPremios/index.m3u8
✅ LivePlayer: Vídeo pronto para reproduzir
```

Se não aparecer `✅ Vídeo pronto`, o stream não está disponível.

### Teste 4: Verificar logs do ZK Studio

No ZK Studio, verifique se aparece:
```
[LiveKitService] 📡 Publicação Ativa
[VideoComposer] 🎬 Frame X, delay: Yms
```

Se não aparecer frames, o ZK Studio não está gerando vídeo.

## 🔧 CORREÇÕES POSSÍVEIS

### Correção 1: Aguardar HLS ficar disponível

O LiveKit pode levar 10-30 segundos para gerar o HLS após a transmissão começar. O `LivePlayer` já tem lógica para aguardar, mas pode precisar de mais tempo.

### Correção 2: Verificar configuração do LiveKit

No dashboard do LiveKit Cloud:
1. Vá em **Settings** → **HLS**
2. Verifique se HLS está habilitado
3. Verifique se o room `ZkPremios` existe

### Correção 3: Verificar se o ZK Studio está publicando vídeo

No ZK Studio, verifique:
1. Se há fontes de vídeo adicionadas (webcam, tela, imagens)
2. Se o `VideoComposer` está gerando frames
3. Se há erros ao publicar tracks

### Correção 4: Testar com VLC ou outro player HLS

Tente abrir a URL HLS diretamente em um player externo:
```
https://zkoficial-6xokn1hv.livekit.cloud/hls/ZkPremios/index.m3u8
```

Se funcionar no VLC mas não no site, o problema é no `LivePlayer`.
Se não funcionar no VLC, o problema é no LiveKit.

## 📋 CHECKLIST DE DEBUG

- [ ] ZK Studio está transmitindo (logs mostram "AO VIVO")
- [ ] LiveKit está recebendo (logs mostram "Publicação Ativa")
- [ ] URL HLS está correta no Supabase
- [ ] HLS está disponível (teste com curl ou navegador)
- [ ] Console do navegador não mostra erros de CORS
- [ ] Console do navegador não mostra erros de mídia
- [ ] `LivePlayer` está tentando carregar a URL
- [ ] `LivePlayer` mostra "Aguardando stream" ou "Carregando"

## 🎯 PRÓXIMOS PASSOS

1. **Teste a URL HLS diretamente** no navegador
2. **Verifique o console do navegador** para erros
3. **Verifique os logs do ZK Studio** para confirmar publicação
4. **Aguarde 30 segundos** após iniciar a transmissão (HLS pode demorar)

**Com essas informações, vamos identificar exatamente onde está o problema!**

