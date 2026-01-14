# ✅ Connection String Configurada

## 🔑 Connection String do Supabase

Sua connection string foi configurada com o schema `evolution_api`:

```
postgresql://postgres:Joao123.@&*(@db.bukigyhhgrtgryklabjg.supabase.co:5432/postgres?schema=evolution_api
```

---

## ⚙️ Arquivo `.env` Criado

O arquivo `evolution-api-main/.env` foi criado com sua connection string configurada!

**Localização:** `evolution-api-main/.env`

---

## 🔐 Próximo Passo: Gerar API Key

Você precisa gerar uma chave secreta para autenticação. Escolha uma opção:

### Opção 1: Linux/Mac
```bash
openssl rand -hex 32
```

### Opção 2: Node.js
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Opção 3: Online
- Acesse: https://randomkeygen.com/
- Use uma "CodeIgniter Encryption Keys"

### Opção 4: PowerShell (Windows)
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | % {[char]$_})
```

---

## 📝 Editar `.env`

1. Abra: `evolution-api-main/.env`
2. Encontre a linha:
   ```env
   AUTHENTICATION_API_KEY=GERE_UMA_CHAVE_SECRETA_AQUI_OU_USE_A_MESMA_DO_FRONTEND
   ```
3. Substitua pela chave gerada:
   ```env
   AUTHENTICATION_API_KEY=sua_chave_gerada_aqui
   ```

**⚠️ IMPORTANTE:** Use a mesma chave no frontend (`VITE_EVOLUTION_API_KEY`)!

---

## 🚀 Próximos Passos

1. ✅ Connection string configurada
2. ⏭️ Gerar API Key (veja acima)
3. ⏭️ Configurar Redis
4. ⏭️ Iniciar Evolution API
5. ⏭️ Criar instância WhatsApp

---

## 📋 Checklist Rápido

- [x] Schema `evolution_api` criado
- [x] Connection string configurada no `.env`
- [ ] API Key gerada e configurada
- [ ] Redis rodando
- [ ] Evolution API iniciada
- [ ] Instância WhatsApp criada

---

## 🔍 Verificar Connection String

Para testar se a connection string está correta, você pode:

1. **Iniciar Evolution API:**
   ```bash
   cd evolution-api-main
   docker-compose up -d
   # ou
   npm install && npm run start
   ```

2. **Verificar logs:**
   - Se conectar ao banco, verá mensagens de sucesso
   - Se houver erro, verá mensagem de erro de conexão

---

## ⚠️ Segurança

- ✅ Connection string está no `.env` (não commitar no Git)
- ✅ Schema separado (`evolution_api`) para isolamento
- ⚠️ **NÃO compartilhe** a connection string publicamente
- ⚠️ **NÃO commite** o arquivo `.env` no Git

---

**Status:** ✅ Connection string configurada e pronta para uso!

