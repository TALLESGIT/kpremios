# ZK Studio – Professional Streaming Package

Este documento descreve as melhorias do **novo ZK Studio** (pacote profissional de streaming): correções de stats, telemetria avançada, watchdog de produção, estabilização de áudio, pipeline GPU e presets de qualidade.

---

## [X] Stats Fix & Aggregated Polling

O problema de **"Zero Stats"** na UI foi resolvido com um sistema centralizado de agregação de telemetria.

- **Integração com OutputManager:** a UI passa a consultar `OutputManager.GetAggregatedStats()`, que reúne dados de todas as saídas ativas (Agora, RTMP VPS, Cloudflare, etc.).
- **Cálculo real de bitrate (RTMP):** em `RtmpOutput.cs` o bitrate é calculado em tempo real a partir dos dados enviados ao FFmpeg, dando feedback preciso no streaming via VPS.
- **Aceleração de hardware para RTMP:** detecção automática no FFmpeg:
  - Preferência: **NVENC (NVIDIA)** → **QuickSync (Intel)** → **AMF (AMD)** → CPU.
  - Reduz travamentos em cenas com muito movimento.
- **Unified Health:** o indicador de saúde reflete o **pior caso** entre todas as saídas ativas.

---

## [X] Advanced Telemetry (Professional Package)

Métricas adicionais no overlay de diagnóstico para troubleshooting em eventos ao vivo:

| Métrica      | Descrição                                                                 | Elemento UI  |
|-------------|---------------------------------------------------------------------------|---------------|
| **Jitter**  | Variação no tempo de chegada dos pacotes (ms). Alto = instabilidade de rede. | TxtJitter     |
| **Tx/Rx Loss** | Percentual de pacotes perdidos na transmissão (Tx) e recepção (Rx).      | TxtTxLoss, TxtRxLoss |
| **RTT**     | Round-Trip Time até o servidor de streaming.                              | TxtRtt        |

---

## [X] Production Watchdog

Sistema de recuperação automática em `AgoraOutput.cs`:

- **Monitoramento:** verificação da saúde do stream a cada segundo.
- **Auto-recovery:** se o stream permanecer em estado **"Critical"** por mais de 5 segundos, o sistema dispara **RecoverStream()** (ciclo Stop/Start) para restaurar a conexão.

---

## [X] Audio Stabilization (estilo OBS)

Refatoração do motor de áudio com buffer fixo de 10 ms:

- **RingBuffer:** entrega estável de amostras de áudio para a bridge de captura.
- **Zero-Filling:** preenchimento automático de silêncio quando a fonte atrasa, evitando “zumbido” ou estática em picos de CPU.

---

## [X] GPU Zero-Copy Stream

Pipeline de vídeo de alta performance:

- Compartilhamento direto de **texturas DirectX** com o SDK da Agora.
- Evita uso da CPU para encoding e reduz latência e carga do sistema.

---

## [X] Quality Presets

Presets de qualidade para configuração rápida:

| Preset    | Resolução | FPS |
|-----------|-----------|-----|
| **Low**   | 720p      | 30  |
| **Balanced** | 1080p  | 30  |
| **Ultra** | 1080p     | 60  |

Recomendação para **internet ruim (4G/Wi‑Fi instável):** usar **Low** (720p @ 30fps) no ZK Studio; no site, o espectador pode usar o **seletor de qualidade** (Automático / Alta / Baixa no Agora, ou níveis HLS no player) para reduzir travamentos.

---

## Resumo

- Stats agregados e bitrate real (incl. RTMP).
- Hardware encoding (NVENC/QuickSync/AMF) para RTMP.
- Telemetria: Jitter, Tx/Rx Loss, RTT.
- Watchdog com recuperação automática (Agora).
- Áudio estável (buffer 10 ms, zero-fill).
- Pipeline GPU zero-copy para Agora.
- Presets: Low (720p30), Balanced (1080p30), Ultra (1080p60).
