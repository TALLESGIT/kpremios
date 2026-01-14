# ✅ Schema Evolution API Criado com Sucesso!

## 🎉 Status: Schema `evolution_api` criado no Supabase

O schema separado para a Evolution API foi criado com sucesso usando o MCP Supabase!

---

## 📊 Verificação

✅ **Schema criado:** `evolution_api`  
✅ **Permissões configuradas:** postgres, authenticated, service_role  
✅ **Tabelas:** 0 (serão criadas automaticamente pela Evolution API)  

---

## 🔑 Próximo Passo: Obter Connection String

### 1. Acesse o Dashboard do Supabase
- URL: https://app.supabase.com
- Selecione seu projeto

### 2. Vá em Settings → Database
- Role até a seção **Connection string**
- Selecione **URI** (não "Session mode")

### 3. Copie a Connection String
A string aparecerá assim:
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

**OU** (Connection pooling):
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

### 4. Substitua `[PASSWORD]` pela senha real
- **Settings** → **Database** → **Database password**
- Se não souber, pode resetar

### 5. Adicione o schema no final
**IMPORTANTE:** Adicione `?schema=evolution_api` no final da connection string!

**Exemplo final:**
```
postgresql://postgres:MinhaSenha123@db.abcdefghijklmnop.supabase.co:5432/postgres?schema=evolution_api
```

---

## ⚙️ Configurar Evolution API

### Edite `evolution-api-main/.env`:

```env
# Banco de Dados - Supabase (Schema Separado)
DATABASE_PROVIDER=postgresql
DATABASE_CONNECTION_URI=postgresql://postgres:SUA_SENHA@db.SEU_PROJECT_REF.supabase.co:5432/postgres?schema=evolution_api
DATABASE_CONNECTION_CLIENT_NAME=evolution
```

**⚠️ Lembre-se:**
- Substitua `SUA_SENHA` pela senha real
- Substitua `SEU_PROJECT_REF` pelo ID do seu projeto
- **Mantenha `?schema=evolution_api` no final!**

---

## 📋 Checklist

- [x] Schema `evolution_api` criado
- [x] Permissões configuradas
- [ ] Connection string obtida do Supabase
- [ ] Connection string configurada no `.env` da Evolution API
- [ ] Redis configurado
- [ ] Evolution API iniciada
- [ ] Instância WhatsApp criada

---

## 🔍 Verificar Schema no Supabase

Você pode verificar o schema criado:

1. **Dashboard Supabase** → **SQL Editor**
2. Execute:
```sql
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name = 'evolution_api';
```

Deve retornar:
```
schema_name
-----------
evolution_api
```

---

## 📚 Próximos Passos

1. ✅ **Schema criado** (feito!)
2. ⏭️ **Obter connection string** (veja acima)
3. ⏭️ **Configurar Evolution API** (veja `SETUP_EVOLUTION_API_COMPLETO.md`)
4. ⏭️ **Configurar Redis**
5. ⏭️ **Iniciar Evolution API**
6. ⏭️ **Criar instância WhatsApp**

---

## 🎯 Vantagens do Schema Separado

✅ **Isolamento:** Dados da Evolution API separados do schema principal  
✅ **Organização:** Fácil identificar tabelas da Evolution API  
✅ **Segurança:** Permissões específicas para o schema  
✅ **Manutenção:** Fácil backup e limpeza se necessário  

---

**Criado em:** 2025-01-11  
**Status:** ✅ Schema criado com sucesso via MCP Supabase

