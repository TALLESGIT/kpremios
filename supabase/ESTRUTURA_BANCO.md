# 🗄️ Estrutura do Banco de Dados - ZK Prêmios

## 📊 Diagrama de Relacionamentos

```
┌─────────────────┐
│   auth.users    │ (Supabase Auth)
│                 │
│ - id (uuid)     │
│ - email         │
│ - password      │
└────────┬────────┘
         │
         │ 1:1
         │
┌────────▼────────────────┐
│      users/profiles     │
│                         │
│ - id (uuid, PK)        │
│ - name                 │
│ - email                │
│ - whatsapp             │
│ - is_admin             │
│ - free_number          │
│ - extra_numbers[]      │
└────────┬────────────────┘
         │
         │ 1:N
         │
    ┌────▼──────────────────────┐
    │                           │
┌───▼──────────────┐   ┌───────▼──────────────┐
│ extra_number_    │   │    raffles           │
│   requests       │   │                      │
│                  │   │ - id (uuid, PK)      │
│ - id (uuid, PK)  │   │ - title              │
│ - user_id        │   │ - prize              │
│ - raffle_id      │   │ - prize_image        │
│ - payment_amount │   │ - status             │
│ - status         │   │ - winner_id          │
│ - payment_proof  │   │ - created_by         │
└──────────────────┘   └──────────────────────┘
         │
         │ 1:N
         │
┌────────▼──────────────┐
│   payment_proofs     │
│                      │
│ - id (uuid, PK)      │
│ - request_id         │
│ - file_url           │
│ - uploaded_by        │
└──────────────────────┘


┌─────────────────────────────────────────────┐
│           SISTEMA DE NÚMEROS                │
│                                             │
│  ┌──────────────┐       ┌─────────────┐   │
│  │   numbers    │       │draw_results │   │
│  │              │       │             │   │
│  │ - number(PK) │       │ - id        │   │
│  │ - is_available│      │ - winner_id │   │
│  │ - selected_by│       │ - number    │   │
│  │ - is_free    │       │ - prize     │   │
│  └──────────────┘       └─────────────┘   │
└─────────────────────────────────────────────┘


┌─────────────────────────────────────────────┐
│        SISTEMA DE JOGOS AO VIVO             │
│                                             │
│  ┌───────────────┐      ┌──────────────┐  │
│  │  live_games   │ 1:N  │live_         │  │
│  │               │─────▶│participants  │  │
│  │ - id          │      │              │  │
│  │ - title       │      │ - id         │  │
│  │ - status      │      │ - game_id    │  │
│  │ - winner_id   │      │ - user_id    │  │
│  └───────────────┘      │ - status     │  │
│                         └──────────────┘  │
│                                           │
│  ┌───────────────┐                        │
│  │ live_raffles  │                        │
│  │               │                        │
│  │ - id          │                        │
│  │ - title       │                        │
│  │ - participants│                        │
│  │ - is_active   │                        │
│  └───────────────┘                        │
└─────────────────────────────────────────────┘


┌─────────────────────────────────────────────┐
│              AUDITORIA                      │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │         audit_logs                   │  │
│  │                                      │  │
│  │ - id (uuid, PK)                      │  │
│  │ - action                             │  │
│  │ - table_name                         │  │
│  │ - old_values (jsonb)                 │  │
│  │ - new_values (jsonb)                 │  │
│  │ - performed_by                       │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘


┌─────────────────────────────────────────────┐
│         STORAGE BUCKETS                     │
│                                             │
│  📁 prize-images/                           │
│     - Imagens dos prêmios (5MB)             │
│     - Formatos: jpg, png, gif, webp         │
│                                             │
│  📁 payment-proofs/                         │
│     - Comprovantes de pagamento (5MB)       │
│     - Formatos: jpg, png, pdf               │
└─────────────────────────────────────────────┘
```

---

## 📋 Detalhamento das Tabelas

### 👤 **users** (Tabela Principal de Usuários)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | ID único (referência ao auth.users) |
| `name` | text | Nome do usuário |
| `email` | text | Email (único) |
| `whatsapp` | text | Número de WhatsApp |
| `free_number` | integer | Número grátis da rifa |
| `extra_numbers` | integer[] | Array de números extras |
| `is_admin` | boolean | Se é administrador |
| `created_at` | timestamptz | Data de criação |
| `updated_at` | timestamptz | Última atualização |

**Políticas RLS:**
- ✅ Usuários podem ler seus próprios dados
- ✅ Usuários podem atualizar seus próprios dados
- ✅ Admins têm acesso total

---

### 🎯 **numbers** (Números da Rifa)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `number` | integer | Número (1-1000, PK) |
| `is_available` | boolean | Se está disponível |
| `selected_by` | uuid | Quem selecionou |
| `is_free` | boolean | Se é número grátis |
| `assigned_at` | timestamptz | Data de atribuição |

**Políticas RLS:**
- ✅ Todos podem ler números
- ✅ Usuários autenticados podem atualizar

**Dados Iniciais:** 1000 números (1 a 1000) inseridos automaticamente

---

### 💰 **extra_number_requests** (Solicitações de Números Extras)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | ID único |
| `user_id` | uuid | ID do usuário |
| `raffle_id` | uuid | ID da rifa (opcional) |
| `payment_amount` | decimal | Valor pago (mín. R$ 10,00) |
| `requested_quantity` | integer | Quantidade solicitada |
| `status` | text | pending/approved/rejected |
| `payment_proof_url` | text | URL do comprovante |
| `admin_notes` | text | Observações do admin |
| `assigned_numbers` | integer[] | Números atribuídos |
| `rejection_reason` | text | Motivo de rejeição |
| `processed_by` | uuid | Admin que processou |
| `processed_at` | timestamptz | Data de processamento |

**Políticas RLS:**
- ✅ Usuários podem ler suas próprias solicitações
- ✅ Usuários podem criar solicitações
- ✅ Admins podem ver e aprovar todas

---

### 🎁 **raffles** (Rifas)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | ID único |
| `title` | text | Título da rifa |
| `description` | text | Descrição |
| `prize` | text | Prêmio |
| `prize_image` | text | URL da imagem do prêmio |
| `start_date` | timestamptz | Data de início |
| `end_date` | timestamptz | Data de término |
| `max_numbers` | integer | Máximo de números (padrão: 1000) |
| `price_per_number` | decimal | Preço por número (padrão: R$ 10,00) |
| `status` | text | active/finished/cancelled |
| `winner_id` | uuid | ID do vencedor |
| `winning_number` | integer | Número vencedor |
| `finished_at` | timestamptz | Data de finalização |
| `created_by` | uuid | Quem criou |

**Políticas RLS:**
- ✅ Todos podem ler rifas ativas/finalizadas
- ✅ Apenas admins podem criar/editar/deletar

---

### 🎮 **live_raffles** (Rifas ao Vivo)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | ID único |
| `title` | text | Título |
| `description` | text | Descrição |
| `admin_id` | uuid | Admin responsável |
| `max_participants` | integer | Máximo de participantes |
| `is_active` | boolean | Se está ativa |
| `participants` | jsonb | Array de participantes |
| `current_round` | integer | Rodada atual |
| `elimination_interval` | integer | Intervalo entre eliminações (seg) |
| `winner` | jsonb | Dados do vencedor |

**Políticas RLS:**
- ✅ Usuários autenticados podem ler
- ✅ Apenas admins podem criar/gerenciar

---

### 🏆 **live_games** (Jogos ao Vivo - Resta Um)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | ID único |
| `title` | varchar(255) | Título do jogo |
| `description` | text | Descrição |
| `created_by` | uuid | Criador |
| `status` | varchar(20) | waiting/active/finished/cancelled |
| `max_participants` | integer | Máximo de participantes |
| `current_participants` | integer | Participantes atuais |
| `winner_id` | uuid | ID do vencedor |
| `elimination_interval` | integer | Intervalo entre eliminações |
| `started_at` | timestamptz | Início do jogo |
| `finished_at` | timestamptz | Fim do jogo |

---

### 👥 **live_participants** (Participantes de Jogos ao Vivo)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | ID único |
| `game_id` | uuid | ID do jogo |
| `user_id` | uuid | ID do usuário |
| `user_name` | varchar(255) | Nome do usuário |
| `lucky_number` | integer | Número da sorte |
| `status` | varchar(20) | active/eliminated/winner |
| `eliminated_at` | timestamptz | Quando foi eliminado |
| `elimination_round` | integer | Rodada de eliminação |

**Constraints:**
- ✅ Um usuário por jogo
- ✅ Um número da sorte por jogo

---

### 📊 **draw_results** (Resultados dos Sorteios)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | ID único |
| `winning_number` | integer | Número vencedor |
| `winner_id` | uuid | ID do vencedor |
| `prize_amount` | decimal | Valor do prêmio (padrão: R$ 10.000) |
| `draw_date` | timestamptz | Data do sorteio |
| `created_by` | uuid | Quem criou |

**Políticas RLS:**
- ✅ Todos podem ler resultados
- ✅ Apenas admins podem criar/gerenciar

---

### 📝 **audit_logs** (Logs de Auditoria)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | ID único |
| `action` | text | Ação realizada |
| `table_name` | text | Tabela afetada |
| `record_id` | text | ID do registro |
| `old_values` | jsonb | Valores antigos |
| `new_values` | jsonb | Valores novos |
| `performed_by` | uuid | Quem realizou |
| `performed_at` | timestamptz | Quando realizou |
| `ip_address` | inet | IP do usuário |
| `user_agent` | text | User agent |

**Políticas RLS:**
- ✅ Apenas admins podem ler logs

---

### 📄 **payment_proofs** (Comprovantes de Pagamento)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | ID único |
| `request_id` | uuid | ID da solicitação |
| `file_name` | text | Nome do arquivo |
| `file_size` | integer | Tamanho do arquivo |
| `file_type` | text | Tipo do arquivo |
| `file_url` | text | URL do arquivo |
| `uploaded_at` | timestamptz | Data de upload |
| `uploaded_by` | uuid | Quem fez upload |

**Políticas RLS:**
- ✅ Usuários podem ver seus próprios comprovantes
- ✅ Admins podem ver todos

---

### 👤 **profiles** (Perfis Adicionais)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | ID único (ref. auth.users) |
| `name` | text | Nome |
| `email` | text | Email |
| `whatsapp` | text | WhatsApp |
| `is_admin` | boolean | Se é admin |
| `avatar_url` | text | URL do avatar |

**Políticas RLS:**
- ✅ Usuários podem criar seu próprio perfil
- ✅ Usuários podem ler todos os perfis
- ✅ Usuários podem atualizar apenas seu perfil
- ✅ Admins têm acesso total

---

## 🔐 Segurança (RLS - Row Level Security)

Todas as tabelas têm **Row Level Security** habilitado:

### Regras Gerais:

1. **Leitura Pública:**
   - Números da rifa
   - Rifas ativas
   - Resultados de sorteios

2. **Acesso Pessoal:**
   - Usuários podem ver/editar seus próprios dados
   - Usuários podem criar solicitações
   - Usuários podem ver suas próprias solicitações

3. **Acesso Admin:**
   - Admins podem ver/editar TUDO
   - Admins podem aprovar/rejeitar solicitações
   - Admins podem criar rifas e jogos

---

## 🔧 Funções do Banco de Dados

### `update_updated_at_column()`
Atualiza automaticamente o campo `updated_at` quando um registro é modificado.

### `assign_random_extra_numbers(request_id, quantity)`
Atribui números extras aleatórios a uma solicitação aprovada:
1. Busca números disponíveis
2. Marca como não disponíveis
3. Atribui à solicitação
4. Atualiza o usuário

### `update_participants_count()`
Atualiza automaticamente o contador de participantes em `live_games`.

---

## 📈 Índices para Performance

### Tabelas Indexadas:

- `raffles`: status, created_by, start_date, end_date
- `live_games`: status, created_by
- `live_participants`: game_id, user_id, status
- `live_raffles`: admin_id, is_active
- `extra_number_requests`: raffle_id
- `profiles`: email, is_admin

---

## 🎯 Fluxo de Dados Principais

### 1️⃣ Cadastro de Usuário:
```
1. Usuário se registra → auth.users
2. Perfil criado → users/profiles
3. Número grátis disponível
```

### 2️⃣ Solicitação de Números Extras:
```
1. Usuário cria solicitação → extra_number_requests
2. Upload de comprovante → payment_proofs (storage)
3. Admin aprova → assign_random_extra_numbers()
4. Números atribuídos ao usuário
```

### 3️⃣ Sorteio:
```
1. Admin cria sorteio → draw_results
2. Sistema sorteia número vencedor
3. Atualiza winner_id
4. Notifica vencedor
```

### 4️⃣ Jogo ao Vivo (Resta Um):
```
1. Admin cria jogo → live_games
2. Usuários entram → live_participants
3. Sistema elimina participantes
4. Último = vencedor
```

---

**Pronto!** Esta é a estrutura completa do banco de dados do ZK Prêmios! 🎉

