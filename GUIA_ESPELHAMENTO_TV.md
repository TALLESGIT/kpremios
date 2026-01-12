# 📺 Guia: Como Espelhar a Live do Mobile para TV

## 🔌 COMO CONECTAR A TV OU MONITOR DE PC

### **Opção 1: Chromecast (Requer Dispositivo Chromecast)**

#### Como Conectar:
1. **Comprar um Chromecast** (R$ 200-400)
   - Chromecast com Google TV
   - Chromecast Ultra (4K)
   - Ou TV Android TV (já tem Chromecast embutido)

2. **Conectar na TV:**
   - Conecte o Chromecast na entrada HDMI da TV
   - Conecte o cabo de energia USB
   - Ligue a TV e selecione a entrada HDMI correta

3. **Configurar:**
   - Baixe o app "Google Home" no celular
   - Siga as instruções para conectar o Chromecast na mesma rede Wi-Fi do celular

4. **Usar:**
   - Quando você clicar no botão de Cast no site, o Chromecast aparecerá automaticamente
   - Selecione o Chromecast e a live será transmitida para a TV

#### Vantagens:
- ✅ Funciona com qualquer TV (só precisa de entrada HDMI)
- ✅ Melhor qualidade de streaming
- ✅ Controle pelo celular (pausar, aumentar volume, etc.)

---

### **Opção 2: AirPlay (iOS - Requer Apple TV ou TV Compatível)**

#### Como Conectar:

**A) Com Apple TV:**
1. **Comprar Apple TV** (R$ 800-1500)
2. Conectar na TV via HDMI
3. Conectar na mesma rede Wi-Fi do iPhone
4. Pronto! O AirPlay aparece automaticamente

**B) Com TV Compatível (Samsung, LG, etc.):**
1. Verificar se a TV tem AirPlay 2 (TVs de 2019+)
2. TV e iPhone na mesma rede Wi-Fi
3. Pronto! Funciona direto

#### Vantagens:
- ✅ Nativo no iOS (não precisa app)
- ✅ Funciona direto se a TV suportar

---

### **Opção 3: Miracast (Android - Sem Dispositivo Adicional)**

#### Como Conectar:

**A) TV com Miracast:**
1. Verificar se a TV tem Miracast/WiDi (TVs Samsung, LG, Sony de 2014+)
2. No Android: Configurações → Conectar → Transmitir tela
3. Selecionar a TV na lista
4. Pronto! A tela do celular aparece na TV

**B) Monitor de PC com Adaptador Miracast:**
1. Comprar adaptador Miracast USB/HDMI (R$ 100-200)
2. Conectar no monitor/PC
3. Conectar via Wi-Fi direto (não precisa estar na mesma rede)

#### Vantagens:
- ✅ Não precisa de dispositivo adicional (se TV suportar)
- ✅ Espelha tudo (não só o vídeo)

---

### **Opção 4: Cabo HDMI (Mais Simples - Para Monitor de PC)**

#### Como Conectar:

**Android:**
1. **Adaptador USB-C para HDMI** (R$ 50-150)
   - Conecte o adaptador no celular
   - Conecte cabo HDMI no adaptador
   - Conecte o outro lado do HDMI no monitor/PC
   - Pronto! A tela aparece no monitor

**iPhone:**
1. **Adaptador Lightning para HDMI** (R$ 200-300)
   - Mesmo processo do Android

#### Vantagens:
- ✅ Mais barato
- ✅ Sem lag
- ✅ Funciona com qualquer monitor/TV
- ❌ Precisa de cabo físico

---

### **Opção 5: DLNA (Smart TV - Via Rede Local)**

#### Como Conectar:
1. **TV e celular na mesma rede Wi-Fi**
2. No celular, abrir o vídeo
3. Procurar opção "Transmitir" ou "DLNA"
4. Selecionar a TV na lista
5. Pronto!

#### Vantagens:
- ✅ Funciona com Smart TVs antigas
- ✅ Não precisa dispositivo adicional

---

## 🎯 Opções Disponíveis

### 1. **Chromecast (Android/Chrome)**
- ✅ Funciona com: Chromecast, Android TV, TVs com Google TV
- ✅ Melhor qualidade de streaming
- ✅ Controle pelo celular
- ❌ Requer dispositivo Chromecast ou TV compatível

### 2. **AirPlay (iOS)**
- ✅ Nativo no iOS
- ✅ Funciona com: Apple TV, TVs compatíveis com AirPlay
- ✅ Fácil de usar
- ❌ Apenas iOS/macOS

### 3. **Miracast (Android)**
- ✅ Espelhamento de tela completo
- ✅ Não requer dispositivo adicional (se TV suportar)
- ❌ Qualidade pode variar
- ❌ Consome mais bateria

### 4. **DLNA**
- ✅ Padrão universal
- ✅ Funciona com Smart TVs
- ❌ Configuração mais complexa

---

## 🚀 Implementação Recomendada

### **Opção 1: Chromecast (Melhor para Android)**

#### Passo 1: Instalar SDK do Chromecast

```bash
npm install cast-web-api
# OU usar a API nativa do Chrome
```

#### Passo 2: Adicionar Botão de Cast

No componente `ZkTVPage.tsx` ou `PublicLiveStreamPage.tsx`:

```typescript
import { useState, useEffect } from 'react';

const CastButton = () => {
  const [isCastAvailable, setIsCastAvailable] = useState(false);
  const [isCasting, setIsCasting] = useState(false);

  useEffect(() => {
    // Verificar se Chromecast está disponível
    if (window.chrome && (window.chrome as any).cast) {
      setIsCastAvailable(true);
    }
  }, []);

  const handleCast = async () => {
    try {
      // Usar a API nativa do Chrome
      const castSession = await (window as any).cast.framework.CastContext.getInstance().requestSession();
      
      const mediaInfo = new (window as any).cast.framework.messages.MediaInfo(
        'https://seu-servidor.com/hls/stream.m3u8', // URL HLS da live
        'application/vnd.apple.mpegurl'
      );
      
      const request = new (window as any).cast.framework.messages.LoadRequest(mediaInfo);
      await castSession.loadMedia(request);
      
      setIsCasting(true);
      toast.success('Transmitindo para TV!');
    } catch (error) {
      console.error('Erro ao transmitir:', error);
      toast.error('Erro ao conectar com Chromecast');
    }
  };

  if (!isCastAvailable) return null;

  return (
    <button
      onClick={handleCast}
      className="p-3 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-xl border border-white/10 transition-all"
      title="Transmitir para TV (Chromecast)"
    >
      <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M1 18v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm0-4v2c4.97 0 9 4.03 9 9h2c0-6.08-4.93-11-11-11zm20-7H3c-1.1 0-2 .9-2 2v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM5 22v-5h2v5h-2z"/>
      </svg>
    </button>
  );
};
```

#### Passo 3: Adicionar Script do Chromecast no HTML

No `index.html` ou `public/index.html`:

```html
<script src="https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1"></script>
```

---

### **Opção 2: AirPlay (iOS)**

#### Passo 1: Adicionar Suporte AirPlay no Vídeo

```typescript
const AirPlayButton = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleAirPlay = () => {
    const video = videoRef.current;
    if (video && (video as any).webkitShowPlaybackTargetPicker) {
      (video as any).webkitShowPlaybackTargetPicker();
    } else {
      toast('AirPlay não disponível neste dispositivo');
    }
  };

  return (
    <>
      <video
        ref={videoRef}
        playsInline
        webkit-playsinline
        x-webkit-airplay="allow"
        // ... outras props
      />
      <button
        onClick={handleAirPlay}
        className="p-3 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-xl border border-white/10"
        title="Transmitir para TV (AirPlay)"
      >
        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.72-2.81-.01-1.81-1.11-2.89-3.35-3.25z"/>
        </svg>
      </button>
    </>
  );
};
```

#### Passo 2: Adicionar Atributos no Elemento de Vídeo

Para HLS (usado no mobile), adicione:

```html
<video
  playsInline
  webkit-playsinline
  x-webkit-airplay="allow"
  controls
  src="https://seu-servidor.com/hls/stream.m3u8"
/>
```

---

### **Opção 3: Solução Universal (Recomendada)**

Criar um componente que detecta automaticamente o dispositivo e oferece a opção correta:

```typescript
// src/components/CastButton.tsx
import { useState, useEffect, useRef } from 'react';
import { Cast, Airplay } from 'lucide-react';
import toast from 'react-hot-toast';

interface CastButtonProps {
  videoUrl?: string; // URL HLS ou do stream
  hlsUrl?: string;
}

export const CastButton: React.FC<CastButtonProps> = ({ videoUrl, hlsUrl }) => {
  const [isCastAvailable, setIsCastAvailable] = useState(false);
  const [isAirPlayAvailable, setIsAirPlayAvailable] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Detectar Chromecast
    if (typeof window !== 'undefined') {
      // Chrome Cast
      if ((window as any).chrome?.cast) {
        setIsCastAvailable(true);
      }
      
      // AirPlay (iOS)
      const video = document.createElement('video');
      if ((video as any).webkitShowPlaybackTargetPicker) {
        setIsAirPlayAvailable(true);
      }
    }
  }, []);

  const handleChromecast = async () => {
    try {
      const castContext = (window as any).cast?.framework?.CastContext?.getInstance();
      if (!castContext) {
        toast.error('Chromecast não disponível');
        return;
      }

      const session = await castContext.requestSession();
      const mediaInfo = new (window as any).cast.framework.messages.MediaInfo(
        hlsUrl || videoUrl || '',
        'application/vnd.apple.mpegurl'
      );
      
      const request = new (window as any).cast.framework.messages.LoadRequest(mediaInfo);
      await session.loadMedia(request);
      
      toast.success('🎉 Transmitindo para TV!');
    } catch (error) {
      console.error('Erro Chromecast:', error);
      toast.error('Erro ao conectar com Chromecast');
    }
  };

  const handleAirPlay = () => {
    const video = videoRef.current || document.querySelector('video');
    if (video && (video as any).webkitShowPlaybackTargetPicker) {
      (video as any).webkitShowPlaybackTargetPicker();
    } else {
      toast('AirPlay não disponível');
    }
  };

  if (!isCastAvailable && !isAirPlayAvailable) {
    return null; // Não mostrar botão se não houver suporte
  }

  return (
    <div className="flex gap-2">
      {isCastAvailable && (
        <button
          onClick={handleChromecast}
          className="p-3 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-xl border border-white/10 transition-all group"
          title="Transmitir para TV (Chromecast)"
        >
          <Cast className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
        </button>
      )}
      
      {isAirPlayAvailable && (
        <button
          onClick={handleAirPlay}
          className="p-3 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-xl border border-white/10 transition-all group"
          title="Transmitir para TV (AirPlay)"
        >
          <Airplay className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
        </button>
      )}
    </div>
  );
};
```

---

## 📱 Como Usar no ZkTVPage

Adicione o botão de cast nos controles:

```typescript
// Em ZkTVPage.tsx
import { CastButton } from '../components/CastButton';

// Dentro do componente, adicione nos controles:
{isLiveActive && (
  <>
    {/* ... outros controles ... */}
    <CastButton 
      hlsUrl={activeStream?.hls_url} 
      videoUrl={settings?.live_url} 
    />
  </>
)}
```

---

## 📋 RESUMO: Qual Opção Escolher?

### Para **Monitor de PC** (mais simples):
1. **Cabo HDMI** (R$ 50-150) - Mais barato e direto
2. **Adaptador Miracast USB** (R$ 100-200) - Sem fio

### Para **TV** (melhor experiência):
1. **Chromecast** (R$ 200-400) - Melhor qualidade, funciona com Android/Chrome
2. **Apple TV** (R$ 800-1500) - Se usar iPhone
3. **Miracast** - Se a TV já suportar (gratuito)

### Para **Qualquer Dispositivo** (universal):
- **Cabo HDMI** sempre funciona, mas precisa estar perto da TV/monitor

---

## 🔧 Configuração Adicional

### Para Chromecast funcionar:

1. **Adicionar script no `index.html`:**
```html
<script src="https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1"></script>
```

2. **Registrar app no Google Cast SDK Console** (opcional, para produção)

### Para AirPlay funcionar:

1. **Adicionar atributos no vídeo:**
```html
<video
  playsInline
  webkit-playsinline
  x-webkit-airplay="allow"
/>
```

2. **Usar URL HLS** (AirPlay funciona melhor com HLS)

---

## 🎯 Resumo

- **Android/Chrome**: Use Chromecast (melhor qualidade)
- **iOS**: Use AirPlay (nativo, fácil)
- **Solução Universal**: Detecte automaticamente e ofereça ambas opções

A implementação mais simples é adicionar o componente `CastButton` que detecta automaticamente o dispositivo e oferece a opção correta!

