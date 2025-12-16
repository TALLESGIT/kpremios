# 🎥 ZK Viewer v1 - Especificação Técnica

## 📋 Visão Geral
Site oficial de transmissão do ZK Studio Pro, otimizado para streaming profissional com baixa latência.

## 🏗️ Arquitetura

```
┌─────────────────────────────────────┐
│   ZK Viewer (React + Vite)          │
│   - Player WebRTC                   │
│   - UI/UX Profissional              │
│   - Mobile-First                    │
└──────────────┬──────────────────────┘
               │
               ↓ WebRTC
┌──────────────────────────────────────┐
│   Agora.io (WebRTC Gateway)         │
│   - Codec: H.264                    │
│   - Audio: Opus 48kHz               │
│   - Latência: < 100ms               │
└──────────────┬───────────────────────┘
               │
               ↓
┌──────────────────────────────────────┐
│   ZK Studio Pro                      │
│   - Broadcast Source                │
│   - 720p/1080p @ 30fps              │
└──────────────────────────────────────┘
```

## 🎯 Princípios Fundamentais

### ✅ O QUE FAZEMOS
- ✅ Receber stream via Agora WebRTC
- ✅ Reproduzir H.264 nativamente
- ✅ Sincronizar áudio Opus
- ✅ UI/UX profissional (Twitch/YouTube style)
- ✅ Mobile-first com fullscreen automático
- ✅ Baixa latência (< 100ms)
- ✅ Estabilidade > Resolução

### ❌ O QUE NÃO FAZEMOS
- ❌ Re-encode de vídeo
- ❌ Processamento de stream
- ❌ Upscale/downscale
- ❌ VP9 ou codecs exóticos
- ❌ 60fps forçado
- ❌ Backend próprio de streaming

## 🎥 Configuração de Vídeo

### Codec
- **Primário**: H.264 (hardware accelerated)
- **Fallback**: VP8 (se H.264 não disponível)
- **Proibido**: VP9, AV1

### Resolução
- **Recebida do Studio**: 720p ou 1080p
- **Renderizada**: Nativa (sem upscale)
- **Mobile**: Adaptada ao viewport (contain)

### Frame Rate
- **Esperado**: 30fps
- **Aceito**: 24-30fps
- **Não forçar**: 60fps

### Bitrate
- **Controlado pelo**: ZK Studio Pro
- **Viewer**: Aceita o que recebe
- **Sem ABR**: Não há backend para múltiplas qualidades

## 🎧 Configuração de Áudio

### Codec
- **Primário**: Opus
- **Sample Rate**: 48kHz
- **Channels**: Stereo (2.0)

### Sincronização
- **Crítico**: Áudio sincronizado com vídeo
- **Latência**: < 50ms de offset
- **Buffer**: Mínimo possível (0-100ms)

### Autoplay
- **Desktop**: Tentativa automática
- **Mobile**: Requer interação do usuário
- **Fallback**: Botão "Clique para iniciar"

## 📱 Mobile (Obrigatório)

### Landscape (Paisagem)
```
┌────────────────────────────────────┐
│  ████████████████████████████████  │ ← Vídeo 100% tela
│  ████████████████████████████████  │
│  ████████████████████████████████  │
└────────────────────────────────────┘
```
- Auto fullscreen ao rotacionar
- Controles overlay transparentes
- Sem letterbox
- Sem cortes

### Portrait (Retrato)
```
┌──────────────┐
│              │
│  ██████████  │ ← Vídeo 16:9
│  ██████████  │   Centralizado
│  ██████████  │
│              │
│  [Controls]  │ ← Controles fixos
└──────────────┘
```
- Vídeo mantém proporção 16:9
- Botão fullscreen visível
- Controles não cobrem vídeo

## 🖥️ Desktop

### Layout Normal
```
┌─────────────────────────────────────┐
│  Header                             │
├─────────────────┬───────────────────┤
│                 │                   │
│   ████████████  │   Chat (opcional) │
│   ████████████  │                   │
│   ████████████  │   [Messages...]   │
│                 │                   │
└─────────────────┴───────────────────┘
```

### Fullscreen
```
┌─────────────────────────────────────┐
│  ████████████████████████████████   │
│  ████████████████████████████████   │
│  ████████████████████████████████   │
│                                     │
│  [Controles overlay - auto-hide]    │
└─────────────────────────────────────┘
```

## 🎮 Controles do Player

### Essenciais
- ▶️ Play / Pause
- 🔇 Mute / Unmute
- 🔊 Volume Slider
- ⛶ Fullscreen
- 🔴 Indicador "AO VIVO"

### Opcionais (v1.1+)
- ⚙️ Qualidade (se Agora permitir)
- 💬 Toggle Chat
- 📊 Stats (latência, fps, bitrate)

### Comportamento
- **Auto-hide**: 3s de inatividade
- **Hover**: Mostrar controles
- **Mobile**: Tap para mostrar/ocultar
- **Fullscreen**: Controles overlay

## 🔄 Gerenciamento de Qualidade

### Sem ABR Real
- Não há backend para múltiplas qualidades
- Agora entrega uma única stream
- Qualidade definida pelo ZK Studio Pro

### Fallback Automático
```javascript
if (conexão_instável) {
  // Agora SDK lida automaticamente
  // Viewer apenas informa o usuário
  showMessage("Conexão instável - ajustando qualidade");
}
```

### Escolha Manual (Futuro)
- Se Agora permitir múltiplos streams
- Botão de qualidade: Auto / 720p / 1080p
- Requer configuração no Studio

## 💬 Chat ao Vivo (Opcional v1)

### Implementação Simples
```typescript
interface ChatMessage {
  id: string;
  user: string;
  message: string;
  timestamp: number;
}
```

### Features v1
- WebSocket ou Socket.io
- Mensagens em tempo real
- Overlay não intrusivo
- Toggle on/off
- Auto-scroll

### Features Futuras (v2)
- Emojis
- Moderação
- Badges
- Slow mode

## 🚨 Tratamento de Erros

### Cenários Críticos

#### 1. Conexão Perdida
```
❌ Conexão perdida
🔄 Reconectando...
⏱️ Tentativa 1 de 3
```

#### 2. Stream Offline
```
⏸️ Transmissão não está ativa
📺 Aguardando início...
```

#### 3. Autoplay Bloqueado
```
▶️ Clique para iniciar
🔊 Seu navegador bloqueou o autoplay
```

#### 4. Codec Não Suportado
```
❌ Navegador não suporta H.264
💡 Tente Chrome, Edge ou Safari
```

## 📊 Métricas de Performance

### Latência Alvo
- **Ideal**: < 100ms (glass-to-glass)
- **Aceitável**: < 500ms
- **Crítico**: > 1000ms (mostrar aviso)

### FPS
- **Esperado**: 30fps constante
- **Mínimo**: 24fps
- **Crítico**: < 20fps (mostrar aviso)

### Buffering
- **Ideal**: 0% do tempo
- **Aceitável**: < 1% do tempo
- **Crítico**: > 5% do tempo

## 🧪 Testes Obrigatórios

### Devices
- ✅ Desktop Chrome/Edge
- ✅ Desktop Firefox
- ✅ Desktop Safari
- ✅ Mobile Android Chrome
- ✅ Mobile iOS Safari
- ✅ Tablet Android/iOS

### Cenários
- ✅ Conexão estável (WiFi)
- ✅ Conexão instável (3G/4G)
- ✅ Rotação de tela
- ✅ Entrada/saída fullscreen
- ✅ Múltiplas abas
- ✅ Background/foreground

### Performance
- ✅ CPU < 30% (desktop)
- ✅ CPU < 50% (mobile)
- ✅ RAM < 200MB
- ✅ Bateria (mobile): Não drenar rápido

## 🔧 Configuração Agora SDK

### Client Config
```typescript
const client = AgoraRTC.createClient({
  mode: 'live',
  codec: 'h264', // Prioridade H.264
});

await client.setClientRole('audience', { 
  level: 1 // Ultra low latency
});
```

### Audio Config
```typescript
track.setVolume(100);
// Zero buffer para baixa latência
setAudioBufferDelay(0);
setJitterBufferDelay(0, 0);
```

### Video Config
```typescript
// Sem processamento adicional
// Renderizar nativamente
videoTrack.play(container);
```

## 📦 Stack Tecnológico

### Core
- **Framework**: React 18+ (Vite)
- **WebRTC**: Agora SDK 4.x
- **Styling**: TailwindCSS
- **Animations**: Framer Motion

### Opcional
- **Chat**: Socket.io-client
- **State**: Zustand (se necessário)
- **Icons**: Lucide React

## 🚀 Roadmap

### v1.0 (MVP) ✅
- Player básico funcional
- Mobile-first
- Baixa latência
- UI profissional

### v1.1 (Melhorias)
- Chat integrado
- Stats overlay
- Qualidade manual (se possível)
- Picture-in-Picture

### v2.0 (Avançado)
- DVR (rewind limitado)
- Clipping
- Compartilhamento social
- Analytics

## 📝 Checklist de Qualidade

### Antes de Deploy
- [ ] Latência < 100ms testada
- [ ] Mobile landscape funcional
- [ ] Fullscreen sem bugs
- [ ] Autoplay com fallback
- [ ] Erros tratados gracefully
- [ ] UI responsiva
- [ ] Performance otimizada
- [ ] Logs limpos (sem spam)

### Pós-Deploy
- [ ] Monitorar latência real
- [ ] Coletar feedback de usuários
- [ ] Ajustar configurações se necessário
- [ ] Documentar issues conhecidos

---

**Desenvolvido com foco em estabilidade, performance e experiência profissional de streaming.**

