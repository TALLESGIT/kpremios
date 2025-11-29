# 🔧 Correções Urgentes - Stream Studio

## Problemas Identificados

### 1. ✅ Preview do PROGRAMA não mostra edições em tempo real
**Status:** Parcialmente corrigido - precisa melhorar

**Problema:** Quando o admin edita no Stream Studio, as mudanças não aparecem instantaneamente no preview do PROGRAMA (AO VIVO).

**Solução:**
- ✅ Já implementado: Atualização otimista do estado local
- ✅ Já implementado: Subscription em tempo real
- ⚠️ **Pendente:** Garantir que o preview do PROGRAMA use a MESMA base de cálculo (1280x720) que o StreamOverlay

### 2. ✅ Posicionamento de logos/imagens não aparece correto
**Status:** Corrigido parcialmente

**Problema:** Quando coloca logo na parte superior ou imagem na parte inferior, não aparece como editado.

**Solução:**
- ✅ Padronizar cálculo de posições para 1280x720 em TODOS os lugares
- ✅ StreamStudio preview do PROGRAMA já corrigido
- ✅ StreamOverlay já usa 1280x720

### 3. ❌ Câmera substitui screen share quando ligada
**Status:** Precisa correção

**Problema:** Quando admin liga câmera com screen share ativo, para os usuários a tela compartilhada some e fica só a câmera em tela cheia.

**Solução:**
- O track combinado já existe e funciona
- Problema pode ser quando câmera é ligada DEPOIS do screen share
- Precisa garantir que sempre use track combinado quando ambos estão ativos

### 4. ❌ Propaganda Overlay Fullscreen não aparece nas cenas
**Status:** Não implementado

**Problema:** Configurou Propaganda Overlay mas não aparece nas cenas.

**Solução:**
- Integrar overlayAd nas cenas do Stream Studio
- Mostrar no preview quando ativado

### 5. ❌ Tela cheia não cobre toda a tela (barras pretas)
**Status:** Precisa correção

**Problema:** Quando coloca em tela cheia, não fica como YouTube (com barras pretas na parte inferior).

**Solução:**
- ✅ Mudar `object-fit: contain` para `cover` no fullscreen
- ✅ Garantir que container ocupe 100% da tela
- ⚠️ Verificar se vídeo está usando aspect ratio correto (16:9)

## Prioridade de Implementação

1. 🔴 **ALTA:** Tela cheia (corrigir object-fit)
2. 🔴 **ALTA:** Câmera mantendo screen share (track combinado sempre)
3. 🟡 **MÉDIA:** Preview do PROGRAMA em tempo real (já parcialmente implementado)
4. 🟡 **MÉDIA:** Propaganda Overlay nas cenas
5. 🟢 **BAIXA:** Otimizações de performance

