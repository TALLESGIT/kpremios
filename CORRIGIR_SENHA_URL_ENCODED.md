# 🔧 Correção: Senha com Caracteres Especiais na Connection String

## ⚠️ Problema

A senha `Joao123.@&*(` contém caracteres especiais que precisam ser **URL-encoded** na connection string.

---

## ✅ Solução: URL-Encode da Senha

### Caracteres Especiais e seus Códigos:

| Caractere | URL-Encoded |
|-----------|-------------|
| `@` | `%40` |
| `&` | `%26` |
| `*` | `%2A` |
| `(` | `%28` |
| `)` | `%29` |

### Senha Original:
```
Joao123.@&*(
```

### Senha URL-Encoded:
```
Joao123.%40%26%2A%28
```

---

## 📝 Connection String Corrigida

### ❌ ERRADO (sem URL-encode):
```
postgresql://postgres.bukigyhhgrtgryklabjg:Joao123.@&*(@aws-1-us-east-2.pooler.supabase.com:6543/postgres?schema=evolution_api
```

### ✅ CORRETO (com URL-encode):
```
postgresql://postgres.bukigyhhgrtgryklabjg:Joao123.%40%26%2A%28@aws-1-us-east-2.pooler.supabase.com:6543/postgres?schema=evolution_api
```

---

## 🔧 Como Atualizar o `.env`

### Opção 1: Editar Manualmente

1. Abra o arquivo `.env`
2. Encontre a linha `DATABASE_CONNECTION_URI`
3. Substitua pela connection string com senha URL-encoded:

```env
DATABASE_CONNECTION_URI=postgresql://postgres.bukigyhhgrtgryklabjg:Joao123.%40%26%2A%28@aws-1-us-east-2.pooler.supabase.com:6543/postgres?schema=evolution_api
```

### Opção 2: Usar PowerShell

```powershell
# Ler arquivo
$content = Get-Content .env -Raw

# Substituir connection string
$newConnectionString = "DATABASE_CONNECTION_URI=postgresql://postgres.bukigyhhgrtgryklabjg:Joao123.%40%26%2A%28@aws-1-us-east-2.pooler.supabase.com:6543/postgres?schema=evolution_api"

# Substituir no conteúdo
$content = $content -replace 'DATABASE_CONNECTION_URI=.*', $newConnectionString

# Salvar
Set-Content .env -Value $content
```

---

## ⏰ Aguardar Circuit Breaker Resetar

O Supabase bloqueou temporariamente devido a muitas tentativas falhadas. **Aguarde 5-10 minutos** antes de tentar novamente.

### Sequência:

1. **Corrigir `.env`** com senha URL-encoded
2. **Aguardar 5-10 minutos** (circuit breaker resetar)
3. **Parar Docker:**
   ```bash
   docker-compose down
   ```
4. **Reiniciar Docker:**
   ```bash
   docker-compose up -d
   ```
5. **Verificar logs:**
   ```bash
   docker logs evolution_api --tail 50
   ```

---

## 🔍 Verificar se Funcionou

Os logs devem mostrar:
```
✅ Database connected successfully
✅ Migrations applied
✅ Server started on port 8080
```

**NÃO deve mostrar:**
- ❌ `Circuit breaker open`
- ❌ `Too many authentication errors`
- ❌ `FATAL: authentication failed`

---

## 💡 Alternativa: Resetar Senha do Supabase

Se preferir evitar URL-encoding, você pode:

1. **Resetar a senha do banco:**
   - Acesse: https://app.supabase.com
   - Vá em: **Settings** → **Database** → **Database password**
   - Clique em **Reset database password**
   - Use uma senha sem caracteres especiais (ex: `Joao123456`)

2. **Atualizar `.env`** com a nova senha

3. **Reiniciar Docker**

---

## 📋 Checklist

- [ ] Senha URL-encoded na connection string
- [ ] `?schema=evolution_api` no final
- [ ] Aguardou 5-10 minutos após último erro
- [ ] Docker parado e reiniciado
- [ ] Logs verificados (sem erros de autenticação)

---

**Status:** ⏳ Aguarde 5-10 minutos e use a connection string com senha URL-encoded

