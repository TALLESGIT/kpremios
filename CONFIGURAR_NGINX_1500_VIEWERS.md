# Configurar Nginx para 1500+ viewers na live

Para o ao vivo suportar **1500 ou mais** conexões WebSocket simultâneas, o Nginx no servidor (VPS) precisa permitir esse número de conexões por worker.

## Onde está o limite

O Nginx usa `worker_connections` no bloco `events { }`. O padrão costuma ser **512** ou **1024**.  
Se for 1024 e houver 1 worker, o máximo de conexões simultâneas fica em torno de **~1000** (algumas são usadas por health checks, etc.). Por isso o teste de carga parou em ~733.

## O que alterar no VPS

### 1. Editar o nginx.conf

```bash
sudo nano /etc/nginx/nginx.conf
```

### 2. Ajustar no topo do arquivo

- **worker_processes** – use `auto` para um processo por CPU (recomendado).
- Dentro do bloco **events { }**, defina **worker_connections** alto o suficiente para 1500+ viewers e margem (health, HTTP, etc.).

Exemplo mínimo para **1500+ viewers**:

```nginx
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 4096;   # permite 4096 conexões por worker (ex.: 1500+ WebSockets)
    # use epoll;                # no Linux, descomente para melhor performance
}
```

Se o servidor tiver vários workers (ex.: 2), o total de conexões pode ser até **2 × 4096 = 8192**.

### 3. Testar e recarregar

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Conferir no servidor

```bash
# Ver valor atual de worker_connections
nginx -T 2>/dev/null | grep worker_connections
```

## Resumo

| Configuração         | Valor sugerido | Motivo                          |
|---------------------|----------------|----------------------------------|
| worker_processes    | auto           | Um processo por CPU              |
| worker_connections  | 4096 ou 8192   | 1500+ viewers + margem para HTTP |

Depois disso, rode de novo o teste de carga (normal ou distribuído) para validar que as 1500 conexões entram.

---

## VPS KVM 2 (2 vCPUs) — ex.: Hostinger

Com **KVM 2** (2 vCPUs), Ubuntu 24.04:

- **worker_processes auto** → Nginx usa **2 workers** (um por vCPU).
- **worker_connections 4096** → até **2 × 4096 = 8192** conexões simultâneas.
- **1500 viewers** fica bem dentro da capacidade (CPU ~2%, RAM ~8% no seu painel indica folga).

Ou seja: o plano aguenta 1500+ na live; o que limita hoje é só o valor de `worker_connections` no Nginx (padrão 512/1024). Ajustando para 4096 e recarregando o Nginx, o servidor passa a aceitar todas as conexões.
