# Configurar MediaMTX no ZK Premios

Para usar suas lives do **ZK Studio** no site **ZK Premios** via MediaMTX (sua VPS).

## 1. Adicionar no `.env`

No arquivo `.env` na raiz do projeto, adicione:

```
VITE_MEDIAMTX_HLS_BASE_URL=http://76.13.82.48:8888
```

(Substitua pelo IP da sua VPS se for diferente.)

## 2. Configurar o ZK Studio

No ZK Studio (Windows):

- **Configurações → Streaming**
- **URL RTMP:** `rtmp://76.13.82.48:1935/live`
- **Stream Key:** o `channel_name` da live (padrão: `ZkOficial`)

## 3. Fluxo

1. No **Admin** do ZK Premios, crie ou selecione uma live (padrão: channel `ZkOficial`)
2. Clique em **Iniciar Live** — o `hls_url` será definido automaticamente
3. No **ZK Studio**, inicie o stream com URL `rtmp://76.13.82.48:1935/live` e Stream Key `ZkOficial`
4. O site exibirá a live via HLS (mobile e desktop)

## URLs

| Uso | URL |
|-----|-----|
| ZK Studio publica | `rtmp://76.13.82.48:1935/live/ZkOficial` |
| Site assiste (HLS) | `http://76.13.82.48:8888/live/ZkOficial/index.m3u8` |
