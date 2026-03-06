# 📺 Nginx-RTMP na VPS + YouTube (opcional)

## Situação atual da sua VPS

- **Nginx na VPS** hoje é usado só para:
  - Proxy reverso do backend (Socket.IO em `api.zkoficial.com.br`)
  - SSL e upgrade WebSocket
- **Não há Nginx-RTMP** instalado nem configurado neste projeto.
- A **live do site** usa **MediaMTX** (HLS/WebRTC) e Agora no viewer, não RTMP na VPS.

Ou seja: **sua VPS própria não usa Nginx-RTMP** no fluxo atual.

---

## Se for usar VPS própria com Nginx-RTMP (ex.: espelhar para YouTube)

Se você quiser instalar **Nginx-RTMP** na VPS para receber RTMP (ex.: OBS) e **repassar (push) para o YouTube**, use estes dados do YouTube:

| Uso | Valor |
|-----|--------|
| **URL do servidor (link)** | `rtmp://a.rtmp.youtube.com/live2` |
| **Chave de transmissão (Stream key)** | A chave que o YouTube mostra em **YouTube Studio → Criar → Transmissão ao vivo → Chave de transmissão** |

- **No OBS:** Servidor = `rtmp://a.rtmp.youtube.com/live2`, Chave = sua chave do YouTube.
- **No Nginx-RTMP (push para YouTube):** no bloco `application live` (ou o nome que você usar), algo assim:

```nginx
# Exemplo: push do stream recebido na VPS para o YouTube
application live {
    live on;
    # Repassar para o YouTube (substitua SUA_CHAVE_YOUTUBE pela chave real)
    push rtmp://a.rtmp.youtube.com/live2/SUA_CHAVE_YOUTUBE;
}
```

Substitua `SUA_CHAVE_YOUTUBE` pela **chave de transmissão** que o YouTube te dá (não compartilhe essa chave).

---

## Resumo

- **Hoje:** VPS **não** usa Nginx-RTMP; não precisa de link/key no projeto.
- **Se configurar Nginx-RTMP** (para restream/YouTube):
  - **Link (URL):** `rtmp://a.rtmp.youtube.com/live2`
  - **Key (keyUrl):** a **Chave de transmissão** do YouTube (YouTube Studio → Transmissão ao vivo).
