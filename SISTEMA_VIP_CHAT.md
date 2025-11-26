# 💎 Sistema VIP para Chat ao Vivo

## 📋 Visão Geral

Sistema de membros VIP para o chat ao vivo, similar ao YouTube, onde:
- Usuários pagam PIX para se tornar VIP
- Mensagens VIP aparecem destacadas no topo da tela (centro)
- Sistema pode ser automático (com gateway) ou manual (com código)

## 🎯 Opções de Implementação

### Opção 1: Sistema Manual com Código de Confirmação (Recomendado para começar)
**Vantagens:**
- ✅ Implementação rápida
- ✅ Sem custos de integração
- ✅ Controle total pelo admin

**Como funciona:**
1. Usuário solicita VIP
2. Sistema gera QR Code PIX único
3. Usuário paga e recebe código de confirmação
4. Usuário digita código no sistema
5. Sistema valida e ativa VIP automaticamente

### Opção 2: Integração com Gateway de Pagamento (Futuro)
**Vantagens:**
- ✅ Ativação automática após pagamento
- ✅ Mais profissional
- ✅ Menos trabalho manual

**Gateways recomendados:**
- **Mercado Pago** (melhor para Brasil)
- **PagSeguro**
- **Stripe** (internacional)

## 🗄️ Estrutura do Banco de Dados

### 1. Adicionar campo `is_vip` na tabela `users`
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_vip boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS vip_since timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS vip_expires_at timestamptz;
```

### 2. Criar tabela `vip_payments`
```sql
CREATE TABLE IF NOT EXISTS vip_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'expired', 'cancelled')),
  pix_code text, -- Código PIX gerado
  confirmation_code text UNIQUE, -- Código de confirmação
  payment_proof_url text,
  expires_at timestamptz, -- Expiração do código
  confirmed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 3. Adicionar campo `is_vip` na tabela `live_chat_messages`
```sql
ALTER TABLE live_chat_messages ADD COLUMN IF NOT EXISTS is_vip boolean DEFAULT false;
```

## 🎨 Interface do Usuário

### Botão "Tornar-se VIP"
- Aparece no chat para usuários não-VIP
- Mostra valor e benefícios
- Ao clicar, abre modal com:
  - QR Code PIX
  - Código de confirmação
  - Instruções

### Mensagens VIP no Chat
- Aparecem no topo da tela (centro)
- Destaque visual (borda dourada, animação)
- Fade out após alguns segundos
- Também aparecem no chat normal com badge VIP

## 🔧 Fluxo de Funcionamento

### Solicitação de VIP:
1. Usuário clica em "Tornar-se VIP"
2. Sistema gera:
   - QR Code PIX único
   - Código de confirmação (ex: `VIP-ABC123`)
   - Expiração de 24 horas
3. Usuário paga PIX
4. Usuário recebe código
5. Usuário digita código no sistema
6. Sistema valida e ativa VIP

### Mensagem VIP:
1. Usuário VIP envia mensagem
2. Mensagem aparece no topo da tela (centro)
3. Aparece também no chat normal com badge
4. Admin pode destacar manualmente

## 💡 Melhorias Futuras

- Integração com Mercado Pago para ativação automática
- Planos VIP (mensal, trimestral, anual)
- Badges personalizados
- Cores personalizadas no chat
- Emojis exclusivos
- Prioridade em sorteios

