# 🚀 Como Rodar o Projeto ZK Prêmios

## 📋 Pré-requisitos

Antes de começar, você precisa ter instalado:

- ✅ **Node.js** (versão 18 ou superior) - [Download](https://nodejs.org/)
- ✅ **npm** (vem com Node.js)
- ✅ **Conta no Supabase** - [Criar conta](https://supabase.com)

---

## 🎯 Passo a Passo Completo

### **1️⃣ Instalar Dependências**

Abra o terminal na pasta do projeto e execute:

```bash
# Instalar dependências do frontend
npm install

# Instalar dependências do backend (se for usar WhatsApp)
cd backend
npm install
cd ..
```

---

### **2️⃣ Configurar Variáveis de Ambiente**

#### **A) Criar arquivo `.env`**

Na raiz do projeto, crie um arquivo chamado `.env`:

```bash
# No Windows (PowerShell)
New-Item -Path .env -ItemType File

# No Linux/Mac
touch .env
```

#### **B) Copiar exemplo e preencher**

Copie o conteúdo do arquivo `.env.example` e preencha com suas credenciais:

```env
# SUPABASE (OBRIGATÓRIO)
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui

# VONAGE (OPCIONAL - só se usar WhatsApp)
VITE_VONAGE_API_KEY=sua-api-key
VITE_VONAGE_API_SECRET=seu-secret
VITE_VONAGE_APPLICATION_ID=seu-app-id
VITE_VONAGE_WHATSAPP_FROM=seu-numero
VITE_VONAGE_REAL_MODE=false
```

#### **C) Obter credenciais do Supabase**

1. Acesse: https://app.supabase.com
2. Entre no seu projeto (ou crie um novo)
3. Vá em **Settings** → **API**
4. Copie:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

---

### **3️⃣ Aplicar Migrações no Supabase**

Antes de rodar o projeto, você precisa criar as tabelas no banco de dados:

#### **Opção A: Via CLI (Recomendado)**

```bash
# Instalar Supabase CLI
npm install -g supabase

# Fazer login
supabase login

# Conectar ao projeto
supabase link --project-ref SEU_PROJECT_ID

# Aplicar migrações
supabase db push
```

#### **Opção B: Via Dashboard Web**

1. Acesse: https://app.supabase.com
2. Vá em **Database** → **SQL Editor**
3. Execute os arquivos SQL da pasta `supabase/migrations/` **NA ORDEM**
4. Veja a ordem completa em: `COMO_MIGRAR_PARA_SUPABASE.md`

**Importante:** Sem as migrações, o projeto não funcionará!

---

### **4️⃣ Rodar o Projeto**

#### **A) Rodar apenas o Frontend (Recomendado para começar)**

```bash
npm run dev
```

O projeto estará disponível em: **http://localhost:5173**

#### **B) Rodar Frontend + Backend (se usar WhatsApp)**

**Terminal 1 - Frontend:**
```bash
npm run dev
```

**Terminal 2 - Backend:**
```bash
cd backend
npm start
# ou para desenvolvimento com auto-reload:
npm run dev
```

---

## ✅ Verificar se Está Funcionando

### **1. Acessar o site**

Abra no navegador: **http://localhost:5173**

### **2. Fazer login como admin**

- **Email:** `admin@zkpremios.com`
- **Senha:** `admin123`

⚠️ **Altere a senha após o primeiro login!**

### **3. Testar funcionalidades**

- ✅ Ver dashboard
- ✅ Criar uma rifa
- ✅ Ver números disponíveis
- ✅ Criar usuário de teste

---

## 🐛 Problemas Comuns

### **Erro: "Missing Supabase environment variables"**

**Causa:** Arquivo `.env` não existe ou está vazio.

**Solução:**
1. Crie o arquivo `.env` na raiz do projeto
2. Adicione as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
3. Reinicie o servidor (`Ctrl+C` e depois `npm run dev`)

---

### **Erro: "Failed to fetch" ou "Network error"**

**Causa:** Credenciais do Supabase incorretas ou migrações não aplicadas.

**Solução:**
1. Verifique se as credenciais no `.env` estão corretas
2. Verifique se aplicou as migrações no Supabase
3. Verifique se o projeto Supabase está ativo

---

### **Erro: "Cannot find module"**

**Causa:** Dependências não instaladas.

**Solução:**
```bash
# Deletar node_modules e reinstalar
rm -rf node_modules package-lock.json
npm install
```

---

### **Porta já em uso**

**Causa:** Outro processo está usando a porta 5173.

**Solução:**
```bash
# No Windows, encontrar e matar o processo:
netstat -ano | findstr :5173
taskkill /PID <numero-do-pid> /F

# No Linux/Mac:
lsof -ti:5173 | xargs kill -9
```

Ou mude a porta no `vite.config.ts`:
```typescript
server: {
  port: 3000  // ou outra porta
}
```

---

### **Erro ao fazer login**

**Causa:** Migrações não aplicadas ou usuário admin não criado.

**Solução:**
1. Aplique todas as migrações (veja passo 3)
2. Verifique se o usuário admin foi criado:
   - Acesse Supabase Dashboard → **Authentication** → **Users**
   - Deve ter um usuário `admin@zkpremios.com`

---

## 📱 Funcionalidades Disponíveis

### **Para Usuários:**
- ✅ Cadastro e login
- ✅ Escolher número grátis
- ✅ Solicitar números extras
- ✅ Ver rifas disponíveis
- ✅ Participar de jogos ao vivo
- ✅ Ver resultados de sorteios

### **Para Administradores:**
- ✅ Dashboard completo
- ✅ Criar e gerenciar rifas
- ✅ Aprovar/rejeitar solicitações
- ✅ Criar jogos ao vivo
- ✅ Gerenciar usuários
- ✅ Enviar notificações WhatsApp (se configurado)

---

## 🔧 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev              # Rodar em modo desenvolvimento

# Build
npm run build            # Criar build de produção
npm run preview          # Preview do build

# Docker (opcional)
npm run docker:build     # Build da imagem Docker
npm run docker:up        # Subir containers
npm run docker:down      # Parar containers

# Linting
npm run lint             # Verificar código
```

---

## 🌐 Deploy em Produção

### **Opção 1: Vercel (Recomendado)**

```bash
# Instalar Vercel CLI
npm install -g vercel

# Fazer deploy
vercel
```

### **Opção 2: Netlify**

```bash
# Build do projeto
npm run build

# Fazer upload da pasta dist/
```

### **Opção 3: Docker**

```bash
# Build
npm run docker:build

# Rodar
npm run docker:run
```

---

## 📚 Documentação Adicional

- **Migração Supabase:** `COMO_MIGRAR_PARA_SUPABASE.md`
- **Estrutura do Banco:** `supabase/ESTRUTURA_BANCO.md`
- **Guia Completo:** `supabase/MIGRACAO_COMPLETA.md`

---

## 🎉 Pronto!

Seu projeto está rodando! 🚀

**Próximos passos:**
1. ✅ Fazer login como admin
2. ✅ Alterar senha do admin
3. ✅ Criar sua primeira rifa
4. ✅ Testar todas as funcionalidades

**Dúvidas?** Consulte a documentação ou verifique os logs no console do navegador (F12).

---

**Desenvolvido com ❤️ para o Brasil 🇧🇷**

