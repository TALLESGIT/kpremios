# 🚀 Como Migrar seu Projeto para o Supabase

## ✅ **BOA NOTÍCIA: Seu projeto JÁ ESTÁ no Supabase!**

Você não precisa migrar nada porque **tudo já está configurado**! 🎉

Só falta **aplicar as migrações** no seu banco de dados Supabase.

---

## 📋 O que você tem agora:

### ✅ **Arquivos Criados:**

1. **3 novas migrações** (faltavam):
   - `20250101_create_raffles_table.sql` - Tabela de rifas
   - `20250102_create_live_raffles_table.sql` - Rifas ao vivo
   - `20250103_create_profiles_table.sql` - Perfis de usuários

2. **4 documentos de ajuda**:
   - `supabase/README.md` - Guia rápido
   - `supabase/MIGRACAO_COMPLETA.md` - Guia completo detalhado
   - `supabase/ESTRUTURA_BANCO.md` - Estrutura do banco com diagramas
   - `COMO_MIGRAR_PARA_SUPABASE.md` - Este arquivo

3. **2 scripts de instalação**:
   - `supabase/apply-migrations.sh` - Para Linux/Mac
   - `supabase/apply-all-migrations.js` - Para Windows/Node.js

---

## 🎯 O que você PRECISA fazer agora:

### **Opção 1: Jeito Mais Fácil (Recomendado)**

```bash
# 1. Instalar o Supabase CLI
npm install -g supabase

# 2. Fazer login no Supabase
supabase login

# 3. Conectar seu projeto
supabase link --project-ref SEU_PROJECT_ID

# 4. Aplicar TODAS as migrações de uma vez
supabase db push
```

**Pronto!** ✅ Todas as 19 tabelas e 2 buckets de storage serão criados!

---

### **Opção 2: Pelo Site do Supabase (Sem instalar nada)**

1. Acesse: https://app.supabase.com
2. Entre no seu projeto
3. Clique em **"Database"** → **"SQL Editor"**
4. Copie e cole o conteúdo de cada arquivo `.sql` da pasta `supabase/migrations/`
5. Execute **UM POR VEZ, NA ORDEM** (veja a lista abaixo)

#### Ordem de Execução:

Execute os arquivos SQL nesta ordem exata:

```
1.  supabase/migrations/20250911150206_tiny_desert.sql
2.  supabase/migrations/20250911160228_yellow_peak.sql
3.  supabase/migrations/20250911161545_light_glitter.sql
4.  supabase/migrations/20250911162352_copper_pebble.sql
5.  supabase/migrations/20250911163000_create_payment_proofs_bucket.sql
6.  supabase/migrations/20250911170000_add_rejection_reason.sql
7.  supabase/migrations/20250911180000_create_live_games_system.sql
8.  supabase/migrations/20241220_fix_live_raffles_rls.sql
9.  supabase/migrations/20241220_fix_profiles_rls.sql
10. supabase/migrations/20241220_fix_user_deletion_rls.sql
11. supabase/migrations/20250119_add_prize_image_to_raffles.sql
12. supabase/migrations/20250119_create_prize_images_bucket.sql
13. supabase/migrations/20250120_add_raffle_status.sql
14. supabase/migrations/20250120_add_user_winner_fields.sql
15. supabase/migrations/20250121_add_raffle_id_to_requests.sql
16. supabase/migrations/20250123_create_update_user_extra_numbers_function.sql

🆕 NOVAS (Execute estas também):
17. supabase/migrations/20250101_create_raffles_table.sql
18. supabase/migrations/20250102_create_live_raffles_table.sql
19. supabase/migrations/20250103_create_profiles_table.sql
```

---

## 📊 O que será criado no Supabase:

### **11 Tabelas:**

1. ✅ `users` - Usuários do sistema
2. ✅ `numbers` - 1000 números da rifa
3. ✅ `extra_number_requests` - Pedidos de números extras
4. ✅ `draw_results` - Resultados dos sorteios
5. ✅ `audit_logs` - Logs de auditoria
6. ✅ `payment_proofs` - Comprovantes de pagamento
7. ✅ `raffles` - Rifas (NOVA! ⭐)
8. ✅ `live_raffles` - Rifas ao vivo (NOVA! ⭐)
9. ✅ `profiles` - Perfis de usuários (NOVA! ⭐)
10. ✅ `live_games` - Jogos ao vivo
11. ✅ `live_participants` - Participantes dos jogos

### **2 Buckets de Storage:**

1. ✅ `prize-images` - Para imagens dos prêmios (até 5MB)
2. ✅ `payment-proofs` - Para comprovantes de pagamento (até 5MB)

### **Segurança:**

- ✅ Row Level Security (RLS) em TODAS as tabelas
- ✅ Políticas de acesso configuradas
- ✅ Apenas admins podem criar/editar dados sensíveis
- ✅ Usuários só veem seus próprios dados

---

## 👤 **IMPORTANTE: Usuário Admin**

Após as migrações, você terá um usuário admin criado:

**Email:** `admin@zkpremios.com`  
**Senha:** `admin123`

⚠️ **ALTERE A SENHA APÓS O PRIMEIRO LOGIN!**

---

## ✅ Como verificar se deu certo?

### No Dashboard do Supabase:

1. Vá em **"Database"** → **"Tables"**
2. Você deve ver **11 tabelas** criadas
3. Vá em **"Storage"**
4. Você deve ver **2 buckets** criados
5. Vá em **"Authentication"** → **"Users"**
6. Você deve ver o usuário `admin@zkpremios.com`

### No seu código:

```bash
# Execute seu projeto
npm run dev

# Tente fazer login com:
# Email: admin@zkpremios.com
# Senha: admin123
```

Se conseguir fazer login, **FUNCIONOU!** 🎉

---

## 🆘 Problemas?

### **Erro: "table already exists"**

Significa que a tabela já foi criada antes. Pode pular essa migração.

### **Erro: "permission denied"**

Você não está logado como admin. Verifique se está usando o usuário correto.

### **Erro: "function does not exist"**

Execute as migrações na ordem correta (veja acima).

### **Outros erros:**

Consulte o guia completo em: `supabase/MIGRACAO_COMPLETA.md`

---

## 📚 Documentação Completa:

- **Guia Rápido:** `supabase/README.md`
- **Guia Completo:** `supabase/MIGRACAO_COMPLETA.md`
- **Estrutura do Banco:** `supabase/ESTRUTURA_BANCO.md`

---

## 🎯 Próximos Passos (Após a Migração):

1. ✅ Fazer login como admin
2. ✅ Alterar senha do admin
3. ✅ Testar criar uma rifa
4. ✅ Testar upload de comprovante
5. ✅ Criar primeiro usuário real
6. ✅ Testar sorteio

---

## 🎉 **Resumo:**

Seu projeto **JÁ ESTÁ** configurado para o Supabase!

Você só precisa:
1. Executar `supabase db push` (Opção 1)
2. OU copiar/colar os SQLs no dashboard (Opção 2)

**É só isso!** 🚀

---

**Dúvidas?** Consulte os outros arquivos de documentação na pasta `supabase/`

