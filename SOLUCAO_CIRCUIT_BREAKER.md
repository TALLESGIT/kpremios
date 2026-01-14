# 🔧 Solução: Circuit Breaker Open - Too Many Authentication Errors

## ❌ Erro

```
Error: Schema engine error:
FATAL: Circuit breaker open: Too many authentication errors
```

## 🔍 Causa

O Supabase bloqueou temporariamente as conexões devido a **muitas tentativas de autenticação falhadas**. Isso acontece quando:

1. A senha está incorreta
2. A connection string está mal formatada
3. Muitas tentativas foram feitas rapidamente

---

## ✅ Solução Passo a Passo

### 1. Aguardar Reset do Circuit Breaker

O circuit breaker do Supabase geralmente reseta em **5-10 minutos**. Aguarde antes de tentar novamente.

### 2. Verificar o Arquivo `.env`

Certifique-se de que o arquivo `.env` existe no mesmo diretório do `docker-compose.yml` e contém:

```env
DATABASE_CONNECTION_URI=postgresql://postgres.bukigyhhgrtgryklabjg:Joao123.@&*(@aws-1-us-east-2.pooler.supabase.com:6543/postgres?schema=evolution_api
```

**⚠️ IMPORTANTE:**
- Verifique se a senha está correta
- Verifique se `?schema=evolution_api` está no final
- Verifique se não há espaços extras ou caracteres especiais mal escapados

### 3. Verificar Senha do Supabase

1. Acesse: https://app.supabase.com
2. Vá em: **Settings** → **Database** → **Database password**
3. Se não souber a senha, você pode resetá-la
4. Certifique-se de usar a senha correta no `.env`

### 4. Parar e Reiniciar Docker

```bash
# Parar todos os containers
docker-compose down

# Aguardar 1-2 minutos (para o circuit breaker resetar)

# Reiniciar
docker-compose up -d
```

### 5. Verificar Logs Novamente

```bash
docker logs evolution_api --tail 50
```

---

## 🔍 Verificar Connection String

### Teste Manual da Connection String

Você pode testar a connection string manualmente usando `psql`:

```bash
# Se tiver psql instalado
psql "postgresql://postgres.bukigyhhgrtgryklabjg:Joao123.@&*(@aws-1-us-east-2.pooler.supabase.com:6543/postgres?schema=evolution_api"
```

Se conectar, a connection string está correta. Se não, verifique a senha.

---

## ⚠️ Problemas Comuns

### Problema 1: Senha com Caracteres Especiais

Se a senha contém caracteres especiais como `@`, `&`, `*`, `(`, `)`, eles precisam ser **URL-encoded** na connection string.

**Exemplo:**
- Senha: `Joao123.@&*(`
- URL-encoded: `Joao123.%40%26%2A%28`

**Connection string com senha URL-encoded:**
```
postgresql://postgres.bukigyhhgrtgryklabjg:Joao123.%40%26%2A%28@aws-1-us-east-2.pooler.supabase.com:6543/postgres?schema=evolution_api
```

### Problema 2: Arquivo `.env` Não Está Sendo Lido

Verifique se:
- O arquivo está no mesmo diretório do `docker-compose.yml`
- O nome é exatamente `.env` (não `.env.example` ou `env`)
- O `docker-compose.yml` tem `env_file: - .env`

### Problema 3: Schema Não Está Sendo Aplicado

Verifique se `?schema=evolution_api` está no final da connection string.

---

## 🔄 Sequência de Recuperação

1. **Parar Docker:**
   ```bash
   docker-compose down
   ```

2. **Aguardar 5-10 minutos** (circuit breaker resetar)

3. **Verificar `.env`:**
   - Senha correta?
   - Schema no final?
   - Formato correto?

4. **Reiniciar Docker:**
   ```bash
   docker-compose up -d
   ```

5. **Verificar logs:**
   ```bash
   docker logs evolution_api --follow
   ```

---

## 📋 Checklist de Verificação

- [ ] Aguardou 5-10 minutos após o erro
- [ ] Arquivo `.env` existe no diretório correto
- [ ] Senha está correta no `.env`
- [ ] Connection string tem `?schema=evolution_api` no final
- [ ] Connection string usa porta `6543` (pooler)
- [ ] Connection string usa `pooler.supabase.com`
- [ ] Docker foi reiniciado após corrigir `.env`
- [ ] Logs mostram conexão bem-sucedida

---

## 💡 Dica: Verificar Senha no Supabase

Se não tiver certeza da senha:

1. Acesse: https://app.supabase.com
2. Vá em: **Settings** → **Database**
3. Role até **Database password**
4. Clique em **Reset database password**
5. Copie a nova senha
6. Atualize o `.env` com a nova senha
7. Reinicie o Docker

---

**Status:** ⏳ Aguarde 5-10 minutos e tente novamente após verificar o `.env`

