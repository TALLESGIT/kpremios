# 🔧 SOLUÇÃO - Cenas do ZK Studio não aparecem no site

## ❌ PROBLEMA

ZK Studio está transmitindo, mas **nada aparece no site**:
- ❌ Imagens não aparecem
- ❌ Vídeos não aparecem  
- ❌ Webcam não aparece
- ❌ Compartilhamento de tela não aparece

## 🔍 DIAGNÓSTICO

O problema mais provável é que **o HLS não está disponível no LiveKit** ou **o LiveKit não está gerando o HLS corretamente**.

### Por que isso acontece?

1. **LiveKit precisa de tempo para gerar HLS**: Após o ZK Studio começar a transmitir, o LiveKit pode levar 10-30 segundos para gerar o arquivo HLS.

2. **HLS pode não estar habilitado**: O LiveKit Cloud precisa ter HLS habilitado no projeto.

3. **Room pode não existir**: O room `ZkPremios` precisa existir no LiveKit.

4. **URL pode estar incorreta**: A URL HLS precisa ser exatamente: `https://zkoficial-6xokn1hv.livekit.cloud/hls/ZkPremios/index.m3u8`

## ✅ SOLUÇÃO PASSO A PASSO

### Passo 1: Verificar se o ZK Studio está transmitindo

No console do ZK Studio, verifique se aparece:
```
[LiveKitService] ✅ Conectado ao LiveKit Cloud
[LiveKitService] 📡 Publicação Ativa
[VideoComposer] 🎬 Frame X, delay: Yms
```

Se não aparecer frames, o ZK Studio não está gerando vídeo.

### Passo 2: Verificar se o HLS está disponível

Abra no navegador (ou use curl):
```
https://zkoficial-6xokn1hv.livekit.cloud/hls/ZkPremios/index.m3u8
```

**Esperado:**
- Se o stream estiver ativo: arquivo `.m3u8` (playlist HLS) com conteúdo
- Se não estiver: erro 404 ou 403

**Se retornar 404:**
- O HLS ainda não está disponível (aguarde 30 segundos)
- O LiveKit não está gerando HLS (verifique configuração)

### Passo 3: Verificar configuração do LiveKit

No dashboard do LiveKit Cloud:
1. Vá em **Settings** → **HLS**
2. Verifique se HLS está **habilitado**
3. Verifique se o room `ZkPremios` existe

### Passo 4: Verificar console do navegador

Abra o DevTools (F12) e verifique:

1. **Network tab**: Procure por requisições para:
   - `index.m3u8` (playlist HLS)
   - `.ts` (segmentos de vídeo HLS)

2. **Console tab**: Procure por:
   - `🔄 LivePlayer: Carregando HLS: ...`
   - `✅ LivePlayer: Vídeo pronto para reproduzir`
   - `❌ LivePlayer: Erro no vídeo: ...`

### Passo 5: Testar com player externo

Tente abrir a URL HLS diretamente em um player externo (VLC, ffplay, etc.):
```
https://zkoficial-6xokn1hv.livekit.cloud/hls/ZkPremios/index.m3u8
```

**Se funcionar no VLC mas não no site:**
- Problema no `LivePlayer` do site
- Verifique erros de CORS no console

**Se não funcionar no VLC:**
- Problema no LiveKit
- HLS não está disponível ou não está habilitado

## 🔧 CORREÇÕES POSSÍVEIS

### Correção 1: Aguardar HLS ficar disponível

O `LivePlayer` já tem lógica para aguardar, mas pode precisar de mais tempo. Após o ZK Studio iniciar a transmissão, **aguarde 30-60 segundos** antes de verificar se o HLS está disponível.

### Correção 2: Verificar se o ZK Studio está publicando vídeo

No ZK Studio, verifique:
1. Se há fontes de vídeo adicionadas (webcam, tela, imagens)
2. Se o `VideoComposer` está gerando frames
3. Se há erros ao publicar tracks

**Se não houver frames sendo gerados:**
- Adicione fontes de vídeo no ZK Studio
- Verifique se as fontes estão ativas
- Verifique se há erros no console do ZK Studio

### Correção 3: Verificar URL HLS no Supabase

Verifique se a URL HLS está correta no banco de dados:

```sql
SELECT id, channel_name, is_active, hls_url 
FROM live_streams 
WHERE is_active = true;
```

**URL esperada:**
```
https://zkoficial-6xokn1hv.livekit.cloud/hls/ZkPremios/index.m3u8
```

**Se a URL estiver incorreta:**
- O ZK Studio precisa atualizar o Supabase com a URL correta
- Verifique a função `notifySupabaseStreamStarted` no ZK Studio

### Correção 4: Habilitar HLS no LiveKit

Se o HLS não estiver habilitado:
1. Acesse o dashboard do LiveKit Cloud
2. Vá em **Settings** → **HLS**
3. Habilite o HLS
4. Salve as configurações

## 📋 CHECKLIST DE VERIFICAÇÃO

- [ ] ZK Studio está transmitindo (logs mostram "AO VIVO")
- [ ] ZK Studio está gerando frames (logs mostram "Frame X")
- [ ] LiveKit está recebendo (logs mostram "Publicação Ativa")
- [ ] URL HLS está correta no Supabase
- [ ] HLS está habilitado no LiveKit Cloud
- [ ] HLS está disponível (teste com curl ou navegador)
- [ ] Console do navegador não mostra erros de CORS
- [ ] Console do navegador não mostra erros de mídia
- [ ] `LivePlayer` está tentando carregar a URL
- [ ] Aguardou 30-60 segundos após iniciar a transmissão

## 🎯 PRÓXIMOS PASSOS

1. **Verifique os logs do ZK Studio** - confirme que está transmitindo e gerando frames
2. **Teste a URL HLS diretamente** - abra no navegador ou use curl
3. **Verifique o console do navegador** - procure por erros
4. **Aguarde 30-60 segundos** - o HLS pode demorar para ficar disponível
5. **Teste com player externo** - VLC ou ffplay para confirmar se o HLS está funcionando

**Com essas informações, vamos identificar exatamente onde está o problema!**

