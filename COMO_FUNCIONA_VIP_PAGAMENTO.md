# 💎 Sistema VIP - Pagamento e Brinde

## 📋 Resumo das Funcionalidades

### 1. **VIP Grátis - Promoção dos 100 Primeiros**

#### **Regras:**
- ✅ Apenas **100 primeiros usuários**
- ✅ Ação: **Cadastro OU Login** (primeira vez após início da promoção)
- ✅ Prazo: **Até 01/02/2026**
- ✅ Exclusões: **Admins NÃO participam**
- ✅ Expiração: **01/02/2026** (data fixa, não 30 dias)

#### **Como Funciona:**
1. **Contador Global**: Sistema rastreia quantos VIPs grátis foram concedidos
2. **Verificação Automática**:
   - No cadastro: Se contador < 100 E data <= 01/02/2026 E não é admin → Concede VIP
   - No login: Se contador < 100 E data <= 01/02/2026 E não é admin E ainda não tem VIP → Concede VIP
3. **Expiração**: Todos os VIPs grátis expiram em **01/02/2026**
4. **Após 01/02/2026**: Não concede mais VIPs grátis, mesmo que não tenha chegado a 100

#### **Estrutura no Banco:**
```sql
-- Campos na tabela users:
- is_vip: boolean (já existe)
- vip_granted_at: timestamp (quando foi concedido)
- vip_expires_at: timestamp (quando expira - 01/02/2026 para grátis)
- vip_type: text ('free' ou 'paid') - tipo de VIP
- vip_payment_id: text (null para grátis)

-- Tabela vip_subscriptions (para pagamentos):
- id, user_id, status, started_at, expires_at, payment_id, renewal_date
```

---

### 2. **Pagamento VIP Mensal - Mercado Pago**

#### **Opção Escolhida: Link Fixo** (Mais Simples)

#### **Como Funciona:**
1. **Usuário clica em "Assinar VIP"**
2. **Abre link do Mercado Pago** em nova aba
3. **Faz pagamento** no Mercado Pago
4. **Sistema verifica pagamento** (manual ou webhook)
5. **Ativa VIP** por 30 dias
6. **Renovação**: A cada mês, verifica se pagou e renova

#### **Fluxo Completo:**
```
Usuário → Clica "Assinar VIP" 
       → Abre link Mercado Pago
       → Faz pagamento
       → Você verifica (manual ou webhook)
       → Sistema ativa VIP (30 dias)
       → Próximo mês: verifica pagamento e renova
```

#### **Estrutura:**
- **Link do Mercado Pago**: Configurável (variável de ambiente ou admin)
- **Tabela `vip_subscriptions`**: Gerencia assinaturas pagas
- **Sistema de verificação**: Job diário verifica expirações

---

## 🎯 Implementação

### **1. Tabela de Assinaturas VIP**
```sql
CREATE TABLE vip_subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  status TEXT, -- 'active', 'expired', 'cancelled'
  started_at TIMESTAMP,
  expires_at TIMESTAMP,
  payment_id TEXT, -- ID do pagamento no Mercado Pago
  renewal_date DATE, -- Próxima data de renovação
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **2. Campos Adicionais em Users**
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS vip_granted_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS vip_expires_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS vip_type TEXT; -- 'free' ou 'paid'
ALTER TABLE users ADD COLUMN IF NOT EXISTS vip_payment_id TEXT;
```

### **3. Função para Conceder VIP Grátis**
```sql
CREATE OR REPLACE FUNCTION grant_free_vip_if_eligible(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_already_vip BOOLEAN;
  v_count INTEGER;
  v_current_date DATE;
BEGIN
  -- Verificar se é admin
  SELECT is_admin INTO v_is_admin FROM users WHERE id = p_user_id;
  IF v_is_admin THEN
    RETURN FALSE; -- Admins não participam
  END IF;
  
  -- Verificar se já tem VIP
  SELECT is_vip INTO v_already_vip FROM users WHERE id = p_user_id;
  IF v_already_vip THEN
    RETURN FALSE; -- Já tem VIP
  END IF;
  
  -- Verificar data
  v_current_date := CURRENT_DATE;
  IF v_current_date > '2026-02-01'::DATE THEN
    RETURN FALSE; -- Promoção expirou
  END IF;
  
  -- Contar VIPs grátis já concedidos
  SELECT COUNT(*) INTO v_count 
  FROM users 
  WHERE vip_type = 'free' AND vip_granted_at IS NOT NULL;
  
  IF v_count >= 100 THEN
    RETURN FALSE; -- Já chegou ao limite
  END IF;
  
  -- Conceder VIP grátis
  UPDATE users SET
    is_vip = TRUE,
    vip_type = 'free',
    vip_granted_at = NOW(),
    vip_expires_at = '2026-02-01 23:59:59'::TIMESTAMP
  WHERE id = p_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### **4. Interface de Pagamento**
- Botão "Assinar VIP" na interface
- Modal com informações e link do Mercado Pago
- Link configurável (variável de ambiente)

### **5. Botão Grupo VIP WhatsApp**
- Visível apenas para VIPs
- Na página da live
- Link configurável

---

## 📝 Variáveis de Ambiente

```env
# Link do Mercado Pago para assinatura VIP
VITE_VIP_MERCADO_PAGO_LINK=https://mpago.la/SEU_LINK_AQUI

# Link do grupo VIP no WhatsApp
VITE_VIP_WHATSAPP_GROUP=https://chat.whatsapp.com/SEU_GRUPO_AQUI
```

---

## 🔄 Fluxo de Verificação

### **VIP Grátis:**
1. Usuário faz cadastro/login
2. Sistema chama `grant_free_vip_if_eligible()`
3. Se elegível → Ativa VIP até 01/02/2026
4. Se não elegível → Não faz nada

### **VIP Pago:**
1. Usuário clica "Assinar VIP"
2. Abre link Mercado Pago
3. Faz pagamento
4. Você verifica (manual ou webhook)
5. Sistema ativa VIP por 30 dias
6. Job diário verifica renovação

---

## ⚠️ Importante

- **VIP Grátis expira em 01/02/2026** (não 30 dias)
- **Apenas 100 primeiros** usuários elegíveis
- **Admins não participam** da promoção
- **Link fixo** do Mercado Pago (mais simples)
- **Verificação manual** ou webhook para pagamentos

---

## 🚀 Próximos Passos

1. Criar migração SQL com tabelas e funções
2. Adicionar lógica no cadastro/login
3. Criar interface de pagamento VIP
4. Adicionar botão grupo WhatsApp
5. Configurar variáveis de ambiente

