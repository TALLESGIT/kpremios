# 🔧 Correção: Connection String Supabase

## ❌ Problema

```
Error: P1001: Can't reach database server at `db.bukigyhhgrtgryklabjg.supabase.co:5432`
```

## 🔍 Causa

O Supabase **bloqueia conexões diretas** na porta `5432` de IPs externos por padrão. Você precisa usar o **Connection Pooler** (porta `6543`) ou adicionar seu IP na whitelist.

---

## ✅ Solução: Usar Connection Pooler

### Opção 1: Connection Pooler (Recomendado)

O Connection Pooler funciona de **qualquer lugar** sem precisar configurar IP whitelist.

**Formato:**
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?schema=evolution_api
```

**Para seu projeto:**
```
postgresql://postgres.bukigyhhgrtgryklabjg:Joao123.@&*(@aws-1-us-east-2.pooler.supabase.com:6543/postgres?schema=evolution_api
```

**⚠️ IMPORTANTE:** 
- Use `postgres.[PROJECT-REF]` (com ponto) ao invés de `postgres:`
- Use porta `6543` ao invés de `5432`
- Use `pooler.supabase.com` ao invés de `db.supabase.co`

---

### Opção 2: Direct Connection (Precisa Whitelist)

Se preferir usar a conexão direta (porta 5432), você precisa:

1. **Obter o IP do servidor onde o Docker está rodando:**
   ```bash
   # Se estiver rodando localmente, use seu IP público
   curl ifconfig.me
   ```

2. **Adicionar IP na whitelist do Supabase:**
   - Acesse: https://app.supabase.com
   - Vá em: **Settings** → **Database** → **Connection Pooling**
   - Role até **IPv4 addresses**
   - Clique em **Add IPv4 address**
   - Cole o IP do seu servidor
   - Salve

3. **Usar connection string direta:**
   ```
   postgresql://postgres:Joao123.@&*(@db.bukigyhhgrtgryklabjg.supabase.co:5432/postgres?schema=evolution_api
   ```

---

## 🔧 Como Atualizar

### 1. Edite o arquivo `.env` (no mesmo diretório do docker-compose.yml)

**Substitua:**
```env
DATABASE_CONNECTION_URI=postgresql://postgres:Joao123.@&*(@db.bukigyhhgrtgryklabjg.supabase.co:5432/postgres?schema=evolution_api
```

**Por (Connection Pooler):**
```env
DATABASE_CONNECTION_URI=postgresql://postgres.bukigyhhgrtgryklabjg:Joao123.@&*(@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?schema=evolution_api
```

### 2. Obter a Connection String Correta do Supabase

1. Acesse: https://app.supabase.com
2. Vá em: **Settings** → **Database**
3. Role até **Connection string**
4. Selecione **Connection Pooling** (não "Direct connection")
5. Selecione **Transaction mode** ou **Session mode**
6. Copie a string que aparece

**Exemplo:**
```
postgresql://postgres.bukigyhhgrtgryklabjg:[YOUR-PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
```

7. **Substitua `[YOUR-PASSWORD]`** pela senha real
8. **Adicione `?schema=evolution_api`** no final

**Resultado final:**
```
postgresql://postgres.bukigyhhgrtgryklabjg:Joao123.@&*(@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?schema=evolution_api
```

### 3. Reiniciar Docker

```bash
docker-compose down
docker-compose up -d
```

### 4. Verificar Logs

```bash
docker logs evolution_api
```

Deve mostrar:
```
✅ Database connected successfully
✅ Migrations applied
```

---

## 📋 Diferenças entre Connection Pooler e Direct Connection

| Característica | Connection Pooler (6543) | Direct Connection (5432) |
|----------------|-------------------------|-------------------------|
| **Funciona de qualquer lugar** | ✅ Sim | ❌ Precisa whitelist |
| **Performance** | ⚡ Melhor para muitas conexões | ⚡ Melhor para conexões longas |
| **Limite de conexões** | 🚀 Até 200 simultâneas | 🚀 Até 60 simultâneas |
| **Configuração** | ✅ Pronto para usar | ⚠️ Precisa configurar IP |
| **Recomendado para** | Aplicações web, APIs | Conexões diretas, scripts |

**Para Evolution API:** Use **Connection Pooler** (porta 6543) ✅

---

## 🔍 Verificar Região do Supabase

Se não souber a região do seu projeto:

1. Acesse: https://app.supabase.com
2. Vá em: **Settings** → **General**
3. Veja o campo **Region**
4. Use no connection string:
   - `sa-east-1` (São Paulo)
   - `us-east-1` (EUA Leste)
   - `eu-west-1` (Europa)
   - etc.

---

## ✅ Checklist

- [ ] Connection string atualizada para usar pooler (porta 6543)
- [ ] Senha substituída na connection string
- [ ] `?schema=evolution_api` adicionado no final
- [ ] Arquivo `.env` atualizado
- [ ] Docker reiniciado
- [ ] Logs verificados (sem erros de conexão)

---

## 🚨 Se Ainda Não Funcionar

1. **Verifique se o schema existe:**
   ```sql
   -- No SQL Editor do Supabase
   SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'evolution_api';
   ```

2. **Verifique a senha:**
   - Settings → Database → Database password
   - Certifique-se de que está usando a senha correta

3. **Teste a conexão manualmente:**
   ```bash
   psql "postgresql://postgres.bukigyhhgrtgryklabjg:Joao123.@&*(@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?schema=evolution_api"
   ```

4. **Verifique firewall/rede:**
   - Certifique-se de que o servidor pode acessar a internet
   - Verifique se há firewall bloqueando a porta 6543

---

**Status:** ✅ Guia de correção criado!

