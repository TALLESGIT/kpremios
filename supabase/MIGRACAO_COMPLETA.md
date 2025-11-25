# 📊 Migração Completa para Supabase - ZK Prêmios

## ✅ O QUE JÁ ESTÁ CONFIGURADO

Seu projeto **já está 100% configurado para usar Supabase**! 🎉

### 📦 Configurações Existentes

1. ✅ **Cliente Supabase** configurado em `src/lib/supabase.ts`
2. ✅ **16 migrações** já criadas na pasta `supabase/migrations/`
3. ✅ **Autenticação** integrada com Supabase Auth
4. ✅ **Storage** configurado para imagens e comprovantes

---

## 📋 TABELAS DO BANCO DE DADOS

### Tabelas Principais

| Tabela | Descrição | Migração |
|--------|-----------|----------|
| `users` | Usuários do sistema | `20250911150206_tiny_desert.sql` |
| `numbers` | Números da rifa (1-1000) | `20250911150206_tiny_desert.sql` |
| `extra_number_requests` | Solicitações de números extras | `20250911150206_tiny_desert.sql` |
| `draw_results` | Resultados dos sorteios | `20250911150206_tiny_desert.sql` |
| `audit_logs` | Logs de auditoria | `20250911150206_tiny_desert.sql` |
| `payment_proofs` | Comprovantes de pagamento | `20250911160228_yellow_peak.sql` |
| `raffles` | Sistema de rifas múltiplas | **`20250101_create_raffles_table.sql`** ⭐ |
| `live_raffles` | Rifas ao vivo | **`20250102_create_live_raffles_table.sql`** ⭐ |
| `profiles` | Perfis de usuários | **`20250103_create_profiles_table.sql`** ⭐ |
| `live_games` | Jogos ao vivo (Resta Um) | `20250911180000_create_live_games_system.sql` |
| `live_participants` | Participantes de jogos ao vivo | `20250911180000_create_live_games_system.sql` |

⭐ = **Novas migrações criadas agora**

### Storage Buckets

1. **`prize-images`** - Imagens dos prêmios (5MB, jpg/png/gif/webp)
2. **`payment-proofs`** - Comprovantes de pagamento (5MB, jpg/png/pdf)

---

## 🚀 COMO APLICAR AS MIGRAÇÕES

### Opção 1: Via Supabase CLI (Recomendado)

```bash
# 1. Instalar Supabase CLI (se ainda não tiver)
npm install -g supabase

# 2. Fazer login no Supabase
supabase login

# 3. Linkar seu projeto
supabase link --project-ref SEU_PROJECT_ID

# 4. Aplicar todas as migrações
supabase db push

# 5. Verificar status das migrações
supabase migration list
```

### Opção 2: Via Dashboard do Supabase (Interface Web)

1. Acesse seu projeto no [Supabase Dashboard](https://app.supabase.com)
2. Vá em **Database** → **Migrations**
3. Clique em **New Migration**
4. Copie e cole o conteúdo de cada arquivo `.sql` da pasta `supabase/migrations/`
5. Execute as migrações **NA ORDEM CRONOLÓGICA** (pelos nomes dos arquivos)

### Opção 3: Via SQL Editor do Supabase

1. Acesse **SQL Editor** no dashboard
2. Copie e cole o conteúdo de cada migração
3. Execute uma por vez, **NA ORDEM**

---

## 📝 ORDEM DE EXECUÇÃO DAS MIGRAÇÕES

**IMPORTANTE:** Execute as migrações nesta ordem exata:

```
1.  20250911150206_tiny_desert.sql              (Tabelas base)
2.  20250911160228_yellow_peak.sql              (Sistema de admin e pagamentos)
3.  20250911161545_light_glitter.sql            (Criar admin padrão)
4.  20250911162352_copper_pebble.sql            (Campo is_admin)
5.  20250911163000_create_payment_proofs_bucket.sql  (Bucket de comprovantes)
6.  20250911170000_add_rejection_reason.sql     (Campo de rejeição)
7.  20250911180000_create_live_games_system.sql (Sistema de jogos ao vivo)
8.  20241220_fix_live_raffles_rls.sql           (Fix RLS live raffles)
9.  20241220_fix_profiles_rls.sql               (Fix RLS profiles)
10. 20241220_fix_user_deletion_rls.sql          (Fix deleção de usuários)
11. 20250119_add_prize_image_to_raffles.sql     (Imagens de prêmios)
12. 20250119_create_prize_images_bucket.sql     (Bucket de imagens)
13. 20250120_add_raffle_status.sql              (Status de rifas)
14. 20250120_add_user_winner_fields.sql         (Campos de vencedor)
15. 20250121_add_raffle_id_to_requests.sql      (Associar requests a rifas)
16. 20250123_create_update_user_extra_numbers_function.sql  (Função de números extras)

🆕 NOVAS MIGRAÇÕES (Execute estas agora):
17. 20250101_create_raffles_table.sql           (⭐ Criar tabela raffles)
18. 20250102_create_live_raffles_table.sql      (⭐ Criar tabela live_raffles)
19. 20250103_create_profiles_table.sql          (⭐ Criar tabela profiles)
```

---

## 🔐 SEGURANÇA (RLS)

Todas as tabelas têm **Row Level Security (RLS)** habilitado com políticas:

- ✅ Usuários podem ler seus próprios dados
- ✅ Usuários podem criar seus próprios registros
- ✅ Admins têm acesso total
- ✅ Leitura pública para dados públicos (números, rifas ativas)

---

## 👤 USUÁRIO ADMIN PADRÃO

**Email:** `admin@zkpremios.com`  
**Senha:** `admin123`

⚠️ **IMPORTANTE:** Altere a senha após o primeiro login!

---

## 🔧 VARIÁVEIS DE AMBIENTE

Certifique-se de ter estas variáveis no arquivo `.env`:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```

---

## ✅ CHECKLIST DE MIGRAÇÃO

- [ ] Todas as migrações executadas com sucesso
- [ ] Buckets de storage criados
- [ ] Políticas RLS ativas
- [ ] Admin padrão criado
- [ ] Números 1-1000 inseridos na tabela `numbers`
- [ ] Testar login com usuário admin
- [ ] Testar criação de rifa
- [ ] Testar upload de imagens

---

## 🆘 RESOLUÇÃO DE PROBLEMAS

### Erro: "relation already exists"

- **Causa:** Tabela já foi criada anteriormente
- **Solução:** Pule essa migração ou use `DROP TABLE IF EXISTS` antes

### Erro: "permission denied"

- **Causa:** RLS muito restritivo
- **Solução:** Verifique se você está autenticado como admin

### Erro: "function does not exist"

- **Causa:** Função `update_updated_at_column()` não foi criada
- **Solução:** Execute a migração `20250911150206_tiny_desert.sql` primeiro

---

## 📞 SUPORTE

Se encontrar problemas:

1. Verifique os logs no Supabase Dashboard → **Logs**
2. Confirme que as variáveis de ambiente estão corretas
3. Verifique se o RLS está habilitado nas tabelas

---

## 🎯 PRÓXIMOS PASSOS

Após aplicar todas as migrações:

1. ✅ Testar autenticação
2. ✅ Criar primeira rifa
3. ✅ Testar sistema de números
4. ✅ Testar upload de comprovantes
5. ✅ Configurar notificações WhatsApp (se necessário)

---

**Pronto!** Seu sistema ZK Prêmios está 100% no Supabase! 🎉

