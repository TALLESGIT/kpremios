# Correções de Posicionamento e Compartilhamento de Tela

## ✅ Problemas Corrigidos

### 1. 📐 Sistema de Coordenadas Padronizado

**Problema:** Elementos não mantinham a mesma posição entre preview e programa ao vivo.

**Solução Implementada:**
- Padronizado o sistema de coordenadas para usar **1280x720** (16:9) como base
- Todas as coordenadas são armazenadas em pixels baseados nesse canvas padrão
- Na renderização, as coordenadas são convertidas para **porcentagem (%)** baseada nesse canvas
- Isso garante consistência perfeita entre:
  - Preview de edição (DraggableSource)
  - Preview do PROGRAMA (AO VIVO)
  - Stream ao vivo para os usuários

**Arquivos Modificados:**
- `src/components/live/DraggableSource.tsx`: Sistema de coordenadas padronizado
- `src/components/live/StreamStudio.tsx`: Renderização consistente no preview e programa

### 2. 🖥️ Compartilhamento de Tela Visível

**Problema:** A fonte de "Compartilhamento de Tela" não aparecia no preview de edição.

**Solução Implementada:**
- Adicionado placeholder visual do screenshare no preview de edição
- O screenshare aparece com um ícone de monitor e mensagem informativa
- Visual consistente: gradiente roxo, borda destacada, ícone centralizado
- Mensagem clara: "Será exibido ao vivo"

**Localizações:**
- Preview de edição (canvas com DraggableSource)
- Preview do PROGRAMA (AO VIVO)
- Mensagem indica que será exibido ao vivo (controlado pelo VideoStream)

### 3. 🎨 Layout Melhorado

**Melhorias Visuais:**
- Preview e PROGRAMA agora ficam **lado a lado** (`grid grid-cols-2`)
- Facilita comparação visual entre edição e resultado final
- Ambos os painéis têm altura consistente (`h-full`)
- Grid de alinhamento visível no preview (opcional, toggle com botão)

### 4. 🔧 Sistema de Snap to Grid Melhorado

**Melhorias:**
- Snap to grid agora funciona com o sistema de coordenadas padronizado
- Grid de 10px baseado no canvas de 1280x720
- Conversão automática entre coordenadas do canvas e pixels do container
- Arrasto e redimensionamento precisos

## 📋 Como Funciona Agora

### Sistema de Coordenadas

1. **Armazenamento:** Todas as posições são armazenadas em pixels baseados em canvas de 1280x720
2. **Edição:** Ao arrastar no preview, o sistema:
   - Captura a posição do mouse em pixels do container
   - Converte para coordenadas do canvas padrão (1280x720)
   - Aplica snap to grid se ativado
   - Salva no banco de dados
3. **Renderização:** Ao exibir:
   - Lê as coordenadas do canvas padrão
   - Converte para porcentagem (%)
   - Renderiza usando CSS com `left: X%`, `top: Y%`, etc.
   - Garante que o elemento aparece na mesma posição em qualquer tamanho de tela

### Visualização do Screenshare

1. **No Preview de Edição:**
   - Aparece como um placeholder roxo com ícone de monitor
   - Pode ser arrastado e redimensionado como qualquer outra fonte
   - Mostra mensagem: "Será exibido ao vivo"

2. **No Preview do PROGRAMA:**
   - Aparece com o mesmo placeholder visual
   - Permite verificar posicionamento antes de ativar

3. **Ao Vivo:**
   - Controlado pelo `VideoStream` component
   - A tela compartilhada aparece em tempo real
   - Overlays aparecem por cima (zIndex alto)

## 🚀 Próximos Passos Recomendados

1. **Testar o posicionamento:**
   - Mover elementos no preview
   - Verificar se aparecem na mesma posição no PROGRAMA
   - Confirmar que funciona ao vivo

2. **Testar o screenshare:**
   - Adicionar fonte de compartilhamento de tela
   - Verificar se aparece no preview
   - Ativar e testar ao vivo

3. **Melhorias Futuras:**
   - Adicionar preview em tempo real do screenshare no canvas de edição (quando disponível)
   - Implementar visualização de câmera no preview
   - Adicionar indicadores visuais de performance

## 📝 Notas Técnicas

- Canvas padrão: **1280x720** (proporção 16:9)
- Sistema de coordenadas: Pixels absolutos baseados no canvas → Porcentagem na renderização
- Grid padrão: 10px
- Snap to grid: Funciona com coordenadas do canvas padrão

