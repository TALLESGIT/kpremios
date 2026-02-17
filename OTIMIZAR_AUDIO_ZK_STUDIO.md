# Otimização de Áudio no ZK Studio

Este documento contém um checklist para reduzir **chiado**, **delay** e **artefatos** no áudio da transmissão ao vivo.

## Problema: Chiado no áudio

O chiado pode ser causado por:

1. **Sample rate mismatch** — ZK Studio e MediaMTX esperam taxas diferentes
2. **Bitrate de áudio inadequado** — muito baixo gera artefatos
3. **Normalização/compressão agressiva** — gera distorção
4. **Padding do encoder Opus** — chiado no final de frases

## Checklist ZK Studio

### Sample rate
- **Recomendado:** 48 kHz (padrão do Opus)
- Evite 44.1 kHz se o destino for Opus nativo
- Verifique nas configurações de áudio do ZK Studio/OBS

### Bitrate de áudio
- **Voz:** 64–128 kbps
- **Música/voz mista:** 128–192 kbps
- Evite bitrates muito baixos (< 64 kbps)

### Encoder
- Use **Opus** quando disponível (baixa latência, boa qualidade)
- Evite normalização automática agressiva
- Desative compressores/limitadores que possam gerar artefatos

### Microfone
- Mantenha o microfone a uma distância adequada (evite saturação)
- Use fones de ouvido para evitar eco (o microfone não deve captar o áudio das caixas)

## Chiado no final de frases

Se o chiado ocorre apenas no **final** de palavras ou frases:

- Pode ser **padding do encoder Opus** ao final dos frames
- Verifique se há **fade-out** ou **silence padding** nas configurações
- Alguns softwares adicionam silêncio entre falas — isso pode gerar ruído residual

## MediaMTX

O MediaMTX **não re-codifica** o áudio — ele repassa o stream SRT (Opus) diretamente para WebRTC. O chiado provavelmente vem do **encoder** (ZK Studio/OBS).

Se necessário, verifique a documentação do MediaMTX para opções de áudio no path.

## Resumo

| Item | Recomendação |
|------|--------------|
| Sample rate | 48 kHz |
| Bitrate áudio | 64–128 kbps (voz) |
| Codec | Opus |
| Normalização | Evitar agressiva |
| Microfone | Distância adequada, fones para evitar eco |
