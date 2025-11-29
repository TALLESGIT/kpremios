# 🎬 Stream Studio - Sistema de Controle de Transmissão Profissional

## O que foi implementado?

Criamos um **sistema completo de controle de transmissão ao vivo** similar ao **OBS Studio**, totalmente integrado ao seu projeto de transmissão com Agora.io.

## ✨ Funcionalidades Implementadas

### 1. **Banco de Dados (Supabase)**

Criadas 3 novas tabelas:

- **`stream_scenes`**: Armazena cenas (Scenes) para cada transmissão
- **`stream_sources`**: Armazena fontes (Sources) - imagens, textos, logos, placares, etc
- **`stream_transitions`**: Armazena transições entre cenas (futuro)

Todas as tabelas têm:
- ✅ Row Level Security (RLS) habilitado
- ✅ Políticas de acesso (admin pode tudo, usuários suas próprias transmissões)
- ✅ Visualização pública (qualquer um pode ver, mas não modificar)

### 2. **Componentes React**

#### **StreamStudio.tsx** - Componente Principal
Localização: `src/components/live/StreamStudio.tsx`

**Funcionalidades:**
- Interface profissional tipo OBS Studio
- Gerenciamento de cenas (criar, editar, duplicar, deletar)
- Gerenciamento de fontes (adicionar, configurar, remover)
- Canvas de Preview (visualizar antes de enviar ao vivo)
- Canvas de Programa (o que está ao vivo)
- Botão "Enviar ao PROGRAMA" para ativar cenas
- Biblioteca de fontes com templates prontos
- Suporta 8 tipos de fontes:
  - Imagem
  - Logo
  - Patrocinador
  - Texto (com configurações de cor, tamanho, alinhamento)
  - Placar (com pontuação em tempo real)
  - Vídeo
  - Câmera
  - Compartilhamento de tela

#### **SourceEditor.tsx** - Editor Visual de Fontes
Localização: `src/components/live/SourceEditor.tsx`

**Funcionalidades:**
- Editor modal profissional para cada fonte
- Controles de posição (X, Y em pixels)
- Controles de tamanho (largura × altura)
- Controle de opacidade (0-100%)
- Controle de camada (Z-Index)
- Upload de imagens (Base64)
- Configurações específicas por tipo:
  - **Texto**: Cor, tamanho, peso, alinhamento, cor de fundo
  - **Placar**: Pontuação Cruzeiro × Adversário, nome do time
  - **Imagens**: URL ou upload direto
- Preview em tempo real das configurações
- Botões de salvar e deletar

### 3. **Integração com AdminLiveStreamPage**

Modificações em: `src/pages/AdminLiveStreamPage.tsx`

**O que foi adicionado:**
- Botão "Stream Studio" (roxo) no controle de transmissões
- Modal fullscreen com o StreamStudio integrado
- Header profissional com gradiente
- Callback `onGoLive` para sincronizar cenas ativas

## 🎯 Como Funciona?

### Fluxo de Trabalho

1. **Admin cria uma transmissão** (já existente)
2. **Clica em "Stream Studio"** → Abre modal fullscreen
3. **Cria cenas** (ex: "Pré-Jogo", "Durante o Jogo", "Intervalo", "Patrocinadores")
4. **Adiciona fontes às cenas** (logos, textos, placar, imagens de sponsors)
5. **Edita posição e estilo** de cada fonte visualmente
6. **Preview** das cenas antes de enviar ao vivo
7. **"Enviar ao PROGRAMA"** → Ativa a cena na transmissão ao vivo
8. **Alterna entre cenas** durante a transmissão em tempo real

### Exemplo Prático: Jogo de Futebol do Cruzeiro

**Cena 1: Pré-Jogo**
- Logo do Cruzeiro (grande, centralizado)
- Logos de 3 patrocinadores principais (rodapé)
- Texto: "Transmissão ao vivo em instantes..."

**Cena 2: Durante o Jogo**
- Placar no topo (Cruzeiro 2 × 1 Adversário)
- Logo do Cruzeiro (canto superior direito, pequeno)
- Logo do patrocinador principal (canto inferior direito)
- Vídeo do jogo ao fundo

**Cena 3: Intervalo**
- 6 logos de patrocinadores em grid
- Texto: "INTERVALO - Voltamos em instantes"

**Cena 4: Pós-Jogo**
- Resultado final (grande, centralizado)
- Agradecimentos aos patrocinadores
- Texto: "Obrigado por assistir!"

## 🔧 Tecnologias Utilizadas

- **React 18** + TypeScript
- **Supabase** (PostgreSQL + Realtime)
- **TailwindCSS** (estilização profissional)
- **Lucide Icons** (ícones modernos)
- **React Hot Toast** (notificações)
- **Agora.io** (transmissão de vídeo - já integrado)

## 📊 Estrutura de Dados

### Scene (Cena)
```typescript
{
  id: string;
  stream_id: string;
  name: string;
  description?: string;
  is_active: boolean; // Cena ativa no PROGRAMA
  layout_config: object; // Configurações futuras
  created_at: timestamp;
  updated_at: timestamp;
}
```

### Source (Fonte)
```typescript
{
  id: string;
  scene_id: string;
  type: 'image' | 'logo' | 'sponsor' | 'text' | 'scoreboard' | 'video' | 'camera' | 'screen';
  name: string;
  url?: string; // Para imagens
  content: {
    // Para texto
    text?: string;
    fontSize?: number;
    color?: string;
    fontWeight?: string;
    textAlign?: string;
    backgroundColor?: string;
    
    // Para placar
    homeScore?: number;
    awayScore?: number;
    awayTeam?: string;
  };
  position: {
    x: number; // pixels
    y: number; // pixels
    width: number; // pixels
    height: number; // pixels
    zIndex: number; // camada
  };
  is_visible: boolean;
  opacity: number; // 0.0 a 1.0
  transform: object; // Futuro: rotação, escala
  animation: object; // Futuro: animações
}
```

## 🚀 Próximos Passos (Opcional)

### Funcionalidades Futuras Sugeridas:

1. **Transições Animadas**
   - Fade entre cenas
   - Slide lateral
   - Dissolve

2. **Drag & Drop Visual**
   - Arrastar fontes no canvas
   - Redimensionar com mouse
   - Grid de alinhamento

3. **Templates Prontos**
   - "Jogo de Futebol Completo"
   - "Stream Simples"
   - "Patrocinadores em Destaque"

4. **Animações de Entrada/Saída**
   - Fade In/Out
   - Slide In/Out
   - Bounce

5. **Chroma Key**
   - Remover fundo verde
   - Integração com câmera

6. **Filtros de Vídeo**
   - Ajuste de cor
   - Brilho/Contraste
   - Saturação

## 📝 Migrações Aplicadas

- ✅ `create_stream_scenes_and_sources.sql` - Tabelas principais
- ✅ Políticas RLS configuradas
- ✅ Índices para performance

## 🎨 Design Patterns Utilizados

- **Component Composition**: StreamStudio + SourceEditor
- **Controlled Components**: Todos os inputs são controlados
- **Separation of Concerns**: Lógica de negócio separada da apresentação
- **Real-time Sync**: Uso de Supabase Realtime para sincronização entre viewers
- **Optimistic Updates**: Atualizações locais antes de confirmar no servidor

## 🐛 Tratamento de Erros

- ✅ Try/catch em todas as operações assíncronas
- ✅ Toast notifications para feedback ao usuário
- ✅ Validações de entrada (tamanho, URL, etc)
- ✅ Fallback para estado inicial em caso de erro

## 🔒 Segurança

- ✅ RLS habilitado em todas as tabelas
- ✅ Apenas admins podem criar/editar transmissões
- ✅ Usuários só podem ver/editar suas próprias transmissões
- ✅ Viewers podem apenas visualizar (read-only)

## 📚 Documentação Criada

1. **GUIA_STREAM_STUDIO.md** - Guia completo para usuários finais
2. **STREAM_STUDIO_README.md** - Documentação técnica (este arquivo)

## 🎓 Treinamento Recomendado

Para admins que usarão o sistema:
1. Ler o `GUIA_STREAM_STUDIO.md`
2. Assistir tutoriais de OBS Studio (conceitos são os mesmos)
3. Praticar criando cenas de teste
4. Fazer uma transmissão de teste completa

## 🆘 Suporte

Em caso de dúvidas:
1. Consulte `GUIA_STREAM_STUDIO.md` para uso
2. Consulte `STREAM_STUDIO_README.md` (este arquivo) para questões técnicas
3. Verifique logs no Supabase Dashboard
4. Entre em contato com o desenvolvedor

---

**Status**: ✅ Completo e Pronto para Uso
**Versão**: 1.0.0
**Data**: Novembro 2025
**Desenvolvido para**: ZK Prêmios - Transmissões do Cruzeiro ⚽

## 🔥 Funcionalidades Destacadas

✨ **Profissional**: Interface tipo OBS Studio
✨ **Fácil de Usar**: Duplo clique para editar
✨ **Tempo Real**: Sincronização via Supabase Realtime
✨ **Flexível**: Suporta 8 tipos de fontes diferentes
✨ **Responsivo**: Funciona em desktop e tablet
✨ **Moderno**: UI com TailwindCSS e gradientes
✨ **Completo**: Preview + Programa + Editor Visual

---

**Pronto para produção! 🚀**
