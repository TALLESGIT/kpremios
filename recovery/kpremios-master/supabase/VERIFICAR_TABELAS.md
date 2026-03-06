# 📊 Verificação de Tabelas do Banco de Dados

## ✅ **TABELAS CRIADAS (Baseado nas Migrações)**

### **Tabelas Principais:**

1. **`users`** - Usuários do sistema
   - Migração: `20250911150206_tiny_desert.sql`
   - Campos: id, name, email, whatsapp, free_number, extra_numbers, is_admin, created_at, updated_at

2. **`numbers`** - Números da rifa (1-1000)
   - Migração: `20250911150206_tiny_desert.sql`
   - Campos: number (PK), is_available, selected_by, is_free, assigned_at

3. **`extra_number_requests`** - Solicitações de números extras
   - Migração: `20250911150206_tiny_desert.sql`
   - Campos: id, user_id, raffle_id, payment_amount, status, payment_proof_url, etc.

4. **`draw_results`** - Resultados dos sorteios
   - Migração: `20250911150206_tiny_desert.sql`
   - Campos: id, winning_number, winner_id, prize_amount, draw_date, created_by

5. **`audit_logs`** - Logs de auditoria
   - Migração: `20250911150206_tiny_desert.sql`
   - Campos: id, action, table_name, record_id, old_values, new_values, etc.

6. **`payment_proofs`** - Comprovantes de pagamento
   - Migração: `20250911160228_yellow_peak.sql`
   - Campos: id, request_id, file_name, file_size, file_type, file_url, uploaded_by

7. **`raffles`** - Sistema de rifas múltiplas
   - Migração: `20250101_create_raffles_table.sql`
   - Campos: id, title, description, prize, prize_image, status, winner_id, etc.

8. **`live_raffles`** - Rifas ao vivo
   - Migração: `20250102_create_live_raffles_table.sql`
   - Campos: id, title, description, admin_id, max_participants, is_active, participants, etc.

9. **`profiles`** - Perfis de usuários
   - Migração: `20250103_create_profiles_table.sql`
   - Campos: id, name, email, whatsapp, is_admin, avatar_url, created_at, updated_at

10. **`live_games`** - Jogos ao vivo (Resta Um)
    - Migração: `20250911180000_create_live_games_system.sql`
    - Campos: id, title, description, status, max_participants, winner_id, etc.

11. **`live_participants`** - Participantes de jogos ao vivo
    - Migração: `20250911180000_create_live_games_system.sql`
    - Campos: id, game_id, user_id, user_name, lucky_number, status, etc.

12. **`live_streams`** - Transmissões ao vivo ⭐
    - Migração: `20250104_create_live_streams_table.sql`
    - Campos: id, title, description, channel_name, is_active, created_by, viewer_count

13. **`live_chat_messages`** - Mensagens do chat ⭐
    - Migração: `20250105_create_live_chat_messages.sql`
    - Campos: id, stream_id, user_id, user_name, message, is_admin, is_system, created_at

---

## 🔍 **COMO VERIFICAR NO SUPABASE:**

### **Via Dashboard:**

1. Acesse: https://app.supabase.com
2. Entre no seu projeto
3. Vá em **Database** → **Tables**
4. Você deve ver todas as 13 tabelas listadas acima

### **Via SQL Editor:**

Execute este SQL para listar todas as tabelas:

```sql
SELECT 
  table_name,
  table_type
FROM 
  information_schema.tables
WHERE 
  table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY 
  table_name;
```

---

## ✅ **CHECKLIST DE VERIFICAÇÃO:**

- [ ] `users` existe
- [ ] `numbers` existe
- [ ] `extra_number_requests` existe
- [ ] `draw_results` existe
- [ ] `audit_logs` existe
- [ ] `payment_proofs` existe
- [ ] `raffles` existe
- [ ] `live_raffles` existe
- [ ] `profiles` existe
- [ ] `live_games` existe
- [ ] `live_participants` existe
- [ ] `live_streams` existe ⭐
- [ ] `live_chat_messages` existe ⭐

---

## 🆘 **SE ALGUMA TABELA NÃO EXISTIR:**

Execute a migração correspondente no SQL Editor do Supabase:

1. Acesse **Database** → **SQL Editor**
2. Copie o conteúdo do arquivo `.sql` da migração
3. Execute o SQL
4. Verifique se a tabela foi criada

---

## 📝 **ORDEM DE EXECUÇÃO DAS MIGRAÇÕES:**

Execute nesta ordem:

1. `20250911150206_tiny_desert.sql` (tabelas base)
2. `20250911160228_yellow_peak.sql` (payment_proofs)
3. `20250911161545_light_glitter.sql` (admin user)
4. `20250911162352_copper_pebble.sql` (is_admin)
5. `20250911163000_create_payment_proofs_bucket.sql` (storage)
6. `20250911170000_add_rejection_reason.sql` (campo extra)
7. `20250911180000_create_live_games_system.sql` (live games)
8. `20241220_fix_live_raffles_rls.sql` (fixes)
9. `20241220_fix_profiles_rls.sql` (fixes)
10. `20241220_fix_user_deletion_rls.sql` (fixes)
11. `20250101_create_raffles_table.sql` ⭐
12. `20250102_create_live_raffles_table.sql` ⭐
13. `20250103_create_profiles_table.sql` ⭐
14. `20250104_create_live_streams_table.sql` ⭐ **IMPORTANTE PARA LIVE STREAMING**
15. `20250105_create_live_chat_messages.sql` ⭐ **IMPORTANTE PARA CHAT**
16. `20250106_add_viewer_count_function.sql` ⭐
17. `20250119_add_prize_image_to_raffles.sql`
18. `20250119_create_prize_images_bucket.sql`
19. `20250120_add_raffle_status.sql`
20. `20250120_add_user_winner_fields.sql`
21. `20250121_add_raffle_id_to_requests.sql`
22. `20250123_create_update_user_extra_numbers_function.sql`

---

## 🎯 **TABELAS ESSENCIAIS PARA LIVE STREAMING:**

Para o sistema de transmissão ao vivo funcionar, você **PRECISA** ter:

1. ✅ `live_streams` - Onde as transmissões são armazenadas
2. ✅ `live_chat_messages` - Onde as mensagens do chat são salvas

**Se essas tabelas não existirem, o sistema não funcionará!**

---

## 🔧 **VERIFICAR SE TABELA EXISTE VIA SQL:**

```sql
-- Verificar se live_streams existe
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'live_streams'
);

-- Verificar se live_chat_messages existe
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'live_chat_messages'
);
```

Se retornar `false`, execute as migrações correspondentes!

