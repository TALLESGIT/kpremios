# 🔑 Resetar Senha do Supabase - Solução Definitiva

## ⚠️ Problema Atual

O circuit breaker do Supabase está aberto devido a muitas tentativas de autenticação falhadas. Mesmo com URL-encoding, pode haver problemas.

---

## ✅ Solução: Resetar Senha do Banco

A melhor solução é **resetar a senha do banco de dados** no Supabase e usar uma senha sem caracteres especiais.

---

## 📋 Passo a Passo

### 1. Acessar Dashboard do Supabase

1. Vá para: https://app.supabase.com
2. Faça login
3. Selecione o projeto: `bukigyhhgrtgryklabjg`

### 2. Resetar Senha do Banco

1. Vá em: **Settings** → **Database**
2. Role até a seção **Database password**
3. Clique em **Reset database password**
4. **Copie a nova senha** (ela será exibida apenas uma vez!)
5. **Salve em um local seguro**

### 3. Obter Connection String Atualizada

1. Na mesma página (Settings → Database)
2. Role até **Connection string**
3. Selecione **Connection Pooling** → **Transaction mode**
4. Copie a connection string
5. **Substitua `[YOUR-PASSWORD]` pela nova senha que você acabou de criar**
6. **Adicione `?schema=evolution_api` no final**

**Exemplo:**
```
postgresql://postgres.bukigyhhgrtgryklabjg:NOVA_SENHA_AQUI@aws-1-us-east-2.pooler.supabase.com:6543/postgres?schema=evolution_api
```

### 4. Atualizar Arquivo `.env`

Edite o arquivo `.env` e atualize a connection string:

```env
DATABASE_CONNECTION_URI=postgresql://postgres.bukigyhhgrtgryklabjg:NOVA_SENHA_AQUI@aws-1-us-east-2.pooler.supabase.com:6543/postgres?schema=evolution_api
```

**⚠️ IMPORTANTE:**
- Use a nova senha (sem caracteres especiais, se possível)
- Mantenha `?schema=evolution_api` no final
- Se a nova senha tiver caracteres especiais, use URL-encoding

### 5. Aguardar Circuit Breaker Resetar

**Aguarde 10-15 minutos** para o circuit breaker resetar completamente.

### 6. Reiniciar Docker

```bash
docker-compose down
# Aguarde 10-15 minutos
docker-compose up -d
```

### 7. Verificar Logs

```bash
docker logs evolution_api --tail 50
```

**Deve mostrar:**
```
✅ Database connected successfully
✅ Migrations applied
✅ Server started on port 8080
```

---

## 💡 Dica: Senha Sem Caracteres Especiais

Ao resetar a senha, use uma senha **sem caracteres especiais** para evitar problemas de URL-encoding:

**Bom:**
- `Joao123456`
- `MinhaSenha2024`
- `EvolutionAPI2024`

**Evitar:**
- `Joao123.@&*(` (tem caracteres especiais)
- `Senha@123!` (tem caracteres especiais)

---

## 🔍 Verificar se Funcionou

### Logs Esperados:

```
✅ Prisma schema loaded
✅ Database connected successfully
✅ Migrations applied
✅ Server started
```

### Logs de Erro (NÃO deve aparecer):

```
❌ Circuit breaker open
❌ Too many authentication errors
❌ FATAL: authentication failed
❌ Migration failed
```

---

## 📋 Checklist Completo

- [ ] Senha do banco resetada no Supabase
- [ ] Nova senha copiada e salva
- [ ] Connection string atualizada com nova senha
- [ ] `?schema=evolution_api` adicionado no final
- [ ] Arquivo `.env` atualizado
- [ ] Aguardou 10-15 minutos (circuit breaker resetar)
- [ ] Docker parado e reiniciado
- [ ] Logs verificados (sem erros)

---

## 🚨 Se Ainda Não Funcionar

1. **Verifique se a senha está correta:**
   - Certifique-se de copiar exatamente como aparece no Supabase
   - Sem espaços extras no início ou fim

2. **Verifique a connection string:**
   - Formato: `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-1-us-east-2.pooler.supabase.com:6543/postgres?schema=evolution_api`
   - Porta: `6543` (pooler)
   - Host: `pooler.supabase.com`

3. **Teste a connection string manualmente:**
   - Use um cliente PostgreSQL (DBeaver, pgAdmin, etc.)
   - Tente conectar com a connection string
   - Se conectar, a connection string está correta

4. **Verifique o schema:**
   - Certifique-se de que o schema `evolution_api` existe
   - Execute no SQL Editor do Supabase:
     ```sql
     SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'evolution_api';
     ```

---

## ⏰ Tempo Estimado

- Resetar senha: 2 minutos
- Aguardar circuit breaker: 10-15 minutos
- Reiniciar Docker: 1 minuto
- **Total: ~15-20 minutos**

---

**Status:** ⏳ Siga os passos acima para resetar a senha e resolver o problema definitivamente!

