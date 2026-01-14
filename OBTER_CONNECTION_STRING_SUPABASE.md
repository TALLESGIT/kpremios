# 🔑 Como Obter Connection String do Supabase (Connection Pooler)

## ✅ Verificação via MCP

- ✅ **Schema `evolution_api` existe** no Supabase
- ✅ **Projeto:** `bukigyhhgrtgryklabjg`
- ✅ **URL do projeto:** `https://bukigyhhgrtgryklabjg.supabase.co`

---

## 📋 Passo a Passo no Dashboard

### 1. Acesse o Dashboard do Supabase

1. Vá para: https://app.supabase.com
2. Faça login
3. Selecione o projeto: `bukigyhhgrtgryklabjg`

### 2. Obter Connection String do Pooler

1. Vá em: **Settings** → **Database**
2. Role até a seção **Connection string**
3. **IMPORTANTE:** Selecione **"Connection Pooling"** (não "Direct connection")
4. Selecione **"Transaction mode"** (recomendado para Evolution API)
5. Copie a string que aparece

**Formato esperado:**
```
postgresql://postgres.bukigyhhgrtgryklabjg:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

### 3. Substituir a Senha

1. Na mesma página (Settings → Database)
2. Role até **Database password**
3. Se não souber a senha, clique em **Reset database password**
4. Copie a senha
5. Na connection string, substitua `[YOUR-PASSWORD]` pela senha real

### 4. Adicionar Schema

**Adicione `?schema=evolution_api` no final da connection string!**

**Exemplo final (sua connection string):**
```
postgresql://postgres.bukigyhhgrtgryklabjg:Joao123.@&*(@aws-1-us-east-2.pooler.supabase.com:6543/postgres?schema=evolution_api
```

---

## 🔍 Identificar a Região

A região aparece na connection string como `aws-0-[REGION]`. Exemplos:

- `aws-0-sa-east-1` = São Paulo, Brasil
- `aws-0-us-east-1` = EUA Leste
- `aws-0-eu-west-1` = Europa Oeste

**Se não souber a região:**
1. Vá em: **Settings** → **General**
2. Veja o campo **Region**
3. Use o código da região na connection string

---

## 📝 Exemplo Completo

**Connection String Final:**
```env
DATABASE_CONNECTION_URI=postgresql://postgres.bukigyhhgrtgryklabjg:Joao123.@&*(@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?schema=evolution_api
```

**Componentes:**
- `postgres.bukigyhhgrtgryklabjg` = usuário (com ponto, não dois pontos!)
- `Joao123.@&*(` = senha (substitua pela sua senha real)
- `aws-0-sa-east-1.pooler.supabase.com` = host do pooler
- `6543` = porta do pooler (não 5432!)
- `postgres` = nome do banco
- `?schema=evolution_api` = schema a usar

---

## ⚠️ Diferenças Importantes

| Item | Direct Connection (5432) | Connection Pooler (6543) |
|------|-------------------------|--------------------------|
| **Formato usuário** | `postgres:` | `postgres.` (com ponto) |
| **Host** | `db.supabase.co` | `pooler.supabase.com` |
| **Porta** | `5432` | `6543` |
| **Funciona de qualquer lugar** | ❌ Precisa whitelist | ✅ Sim |
| **Recomendado para** | Scripts locais | Aplicações, APIs, Docker |

---

## ✅ Checklist

- [ ] Acessei Settings → Database
- [ ] Selecionei "Connection Pooling" (não Direct)
- [ ] Selecionei "Transaction mode"
- [ ] Copiei a connection string
- [ ] Substituí `[YOUR-PASSWORD]` pela senha real
- [ ] Adicionei `?schema=evolution_api` no final
- [ ] Verifiquei que usa porta `6543` (pooler)
- [ ] Verifiquei que usa `pooler.supabase.com` (não `db.supabase.co`)

---

## 🚀 Próximo Passo

Depois de obter a connection string correta:

1. **Crie o arquivo `.env`** no mesmo diretório do `docker-compose.yml`
2. **Cole a connection string** no campo `DATABASE_CONNECTION_URI`
3. **Reinicie o Docker:**
   ```bash
   docker-compose down
   docker-compose up -d
   ```
4. **Verifique os logs:**
   ```bash
   docker logs evolution_api
   ```

Deve mostrar: `✅ Database connected successfully`

---

**Status:** ✅ Guia criado! Siga os passos acima para obter a connection string correta.

