# ⚡ Início Rápido - ZK Prêmios

## 🚀 Rodar o Projeto em 3 Passos

### **1️⃣ Instalar Dependências**

```bash
npm install
```

---

### **2️⃣ Configurar Supabase**

#### **A) Criar arquivo `.env`**

Na raiz do projeto, crie um arquivo `.env` e adicione:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

#### **B) Obter credenciais**

1. Acesse: https://app.supabase.com
2. Entre no seu projeto
3. Vá em **Settings** → **API**
4. Copie **Project URL** e **anon public key**

#### **C) Aplicar migrações**

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login e conectar
supabase login
supabase link --project-ref SEU_PROJECT_ID

# Aplicar migrações
supabase db push
```

---

### **3️⃣ Rodar o Projeto**

```bash
npm run dev
```

Acesse: **http://localhost:5173**

---

## 👤 Login Admin

- **Email:** `admin@zkpremios.com`
- **Senha:** `admin123`

⚠️ Altere a senha após o primeiro login!

---

## 🆘 Problemas?

Consulte: **`COMO_RODAR_PROJETO.md`** para guia completo.

---

**Pronto!** 🎉

