# Corrigir erro MediaMTX: webrtcICEServers

## Erro

```
ERR: json: cannot unmarshal object into Go struct field Conf.webrtcICEServers of type string
```

O MediaMTX espera `webrtcICEServers` como **string** (JSON), mas a config está como objeto/array YAML.

## Solução

Na VPS, edite o arquivo de config do MediaMTX:

```bash
# Descobrir onde está a config (geralmente em um destes):
sudo cat /etc/systemd/system/mediamtx.service | grep -i config
# ou
sudo cat /lib/systemd/system/mediamtx.service | grep -i config
```

Arquivos comuns: `/etc/mediamtx.yml` ou `/opt/mediamtx/mediamtx.yml`

### Formato ERRADO (objeto YAML)

```yaml
webrtcICEServers:
  - urls: stun:stun.l.google.com:19302
```

ou

```yaml
webrtcICEServers:
  - urls: "stun:stun.l.google.com:19302"
```

### Formato CORRETO (string JSON)

```yaml
webrtcICEServers: '[{"urls":"stun:stun.l.google.com:19302"}]'
```

### Ou remover a linha

Se não precisar de ICE servers customizados, **remova ou comente** a linha `webrtcICEServers`. O MediaMTX usa STUN padrão.

```bash
sudo nano /etc/mediamtx.yml
# ou o caminho que aparecer no systemd
```

Procure por `webrtcICEServers` e:
- Troque para: `webrtcICEServers: '[{"urls":"stun:stun.l.google.com:19302"}]'`
- Ou apague/comente a seção inteira

Depois:

```bash
sudo systemctl restart mediamtx
sudo systemctl status mediamtx
```
