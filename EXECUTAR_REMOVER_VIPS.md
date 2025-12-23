# 🗑️ Remover Todos os VIPs Ativos

## 📋 Script SQL Criado

Foi criado o arquivo `supabase/migrations/remove_all_vips.sql` que:
- ✅ Remove `is_vip = true` de todos os usuários
- ✅ Limpa campos relacionados a VIP (`vip_type`, `vip_expires_at`, etc.)
- ✅ Cancela todas as assinaturas VIP ativas
- ✅ Mostra quantos VIPs foram removidos

---

## 🚀 Como Executar

### **Opção 1: Via Supabase Dashboard (Recomendado)**

1. **Acesse:** https://app.supabase.com
2. **Selecione seu projeto**
3. **Vá em:** **SQL Editor** (no menu lateral)
4. **Clique em:** **New Query**
5. **Cole o seguinte SQL:**

```sql
-- Remover todos os VIPs ativos
UPDATE users
SET 
  is_vip = false,
  vip_type = NULL,
  vip_granted_at = NULL,
  vip_expires_at = NULL,
  vip_payment_id = NULL,
  vip_since = NULL
WHERE is_vip = true;

-- Desativar todas as assinaturas VIP ativas
UPDATE vip_subscriptions
SET 
  status = 'cancelled',
  expires_at = NOW()
WHERE status = 'active';

-- Verificar resultado
SELECT 
  COUNT(*) FILTER (WHERE is_vip = true) as vips_restantes,
  COUNT(*) FILTER (WHERE is_vip = false) as usuarios_normais
FROM users;
```

6. **Clique em:** **Run** ou **Executar**
7. **Verifique o resultado** na aba de resultados

---

### **Opção 2: Via Migration (Se preferir)**

1. **Execute a migration:**
   ```bash
   # Se estiver usando Supabase CLI
   supabase db push
   ```

2. **Ou execute manualmente** o SQL do arquivo `supabase/migrations/remove_all_vips.sql`

---

## ✅ Verificação

Após executar, verifique:

1. **Contar VIPs restantes:**
   ```sql
   SELECT COUNT(*) FROM users WHERE is_vip = true;
   ```
   **Resultado esperado:** `0`

2. **Verificar assinaturas ativas:**
   ```sql
   SELECT COUNT(*) FROM vip_subscriptions WHERE status = 'active';
   ```
   **Resultado esperado:** `0`

3. **Listar usuários que eram VIP:**
   ```sql
   SELECT id, name, email, is_vip, vip_type, vip_expires_at 
   FROM users 
   WHERE vip_type IS NOT NULL OR vip_expires_at IS NOT NULL;
   ```

---

## ⚠️ Importante

- **Backup:** Este script remove permanentemente o status VIP
- **Irreversível:** Não há como desfazer (a menos que tenha backup)
- **Teste primeiro:** Se possível, teste em um ambiente de desenvolvimento

---

## 📝 O que o Script Faz

1. **Atualiza tabela `users`:**
   - Define `is_vip = false` para todos
   - Limpa `vip_type`, `vip_granted_at`, `vip_expires_at`, `vip_payment_id`, `vip_since`

2. **Atualiza tabela `vip_subscriptions`:**
   - Define `status = 'cancelled'` para todas as assinaturas ativas
   - Define `expires_at = NOW()` para todas

3. **Mostra estatísticas:**
   - Quantos usuários foram atualizados
   - Quantas assinaturas foram canceladas

---

**Execute o SQL acima no Supabase Dashboard e me avise quando terminar!** 🚀

