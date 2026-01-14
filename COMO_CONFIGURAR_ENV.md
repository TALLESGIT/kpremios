# 🔧 Como Configurar o .env da Evolution API

## ✅ Connection String Já Configurada!

Sua connection string do Supabase já está pronta:
```
postgresql://postgres:Joao123.@&*(@db.bukigyhhgrtgryklabjg.supabase.co:5432/postgres?schema=evolution_api
```

---

## 📝 Passo a Passo

### 1. Copiar arquivo de exemplo

```bash
cd evolution-api-main
cp .env.EXEMPLO .env
```

**OU** crie manualmente o arquivo `.env` na pasta `evolution-api-main/`

### 2. Editar o arquivo `.env`

Abra `evolution-api-main/.env` e edite apenas a linha:

```env
AUTHENTICATION_API_KEY=GERE_UMA_CHAVE_SECRETA_AQUI
```

Substitua por uma chave gerada (veja abaixo).

---

## 🔐 Gerar API Key

### Opção 1: Node.js (Recomendado)
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Opção 2: OpenSSL (Linux/Mac)
```bash
openssl rand -hex 32
```

### Opção 3: PowerShell (Windows)
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | % {[char]$_})
```

### Opção 4: Online
- Acesse: https://randomkeygen.com/
- Use uma "CodeIgniter Encryption Keys"

---

## 📋 Exemplo de `.env` Final

```env
# ... outras configurações ...

# BANCO DE DADOS - JÁ CONFIGURADO! ✅
DATABASE_CONNECTION_URI=postgresql://postgres:Joao123.@&*(@db.bukigyhhgrtgryklabjg.supabase.co:5432/postgres?schema=evolution_api

# AUTENTICAÇÃO - SUBSTITUA AQUI! ⚠️
AUTHENTICATION_API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

---

## ⚠️ IMPORTANTE: Usar Mesma Chave no Frontend

Depois de gerar a API Key, configure também no frontend:

**Arquivo `.env` na raiz do projeto:**
```env
VITE_EVOLUTION_API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

**Use a MESMA chave em ambos os lugares!**

---

## ✅ Checklist

- [x] Connection string configurada
- [ ] Arquivo `.env` criado em `evolution-api-main/`
- [ ] API Key gerada
- [ ] API Key configurada no `.env` da Evolution API
- [ ] API Key configurada no `.env` do frontend
- [ ] Redis configurado
- [ ] Evolution API iniciada

---

## 🚀 Próximos Passos

1. ✅ Connection string configurada (feito!)
2. ⏭️ Criar arquivo `.env` (copie de `.env.EXEMPLO`)
3. ⏭️ Gerar e configurar API Key
4. ⏭️ Configurar Redis
5. ⏭️ Iniciar Evolution API

---

**Status:** ✅ Connection string pronta! Configure a API Key e continue!

