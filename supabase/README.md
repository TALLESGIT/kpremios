# 🎯 Supabase - ZK Prêmios

## 📖 O que é isso?

Este diretório contém todas as **migrações do banco de dados** do sistema ZK Prêmios. 

**Seu projeto já está 100% configurado para usar Supabase!** ✅

---

## 🚀 Como aplicar as migrações?

### Opção 1: Automático via CLI (Mais Fácil)

```bash
# 1. Instalar Supabase CLI
npm install -g supabase

# 2. Fazer login
supabase login

# 3. Linkar seu projeto
supabase link --project-ref SEU_PROJECT_ID

# 4. Aplicar TODAS as migrações
supabase db push
```

### Opção 2: Via Script de Shell

```bash
chmod +x apply-migrations.sh
./apply-migrations.sh
```

### Opção 3: Via Dashboard Web

1. Acesse [Supabase Dashboard](https://app.supabase.com)
2. Vá em **Database** → **SQL Editor**
3. Copie e cole o conteúdo de cada arquivo `.sql` da pasta `migrations/`
4. Execute **NA ORDEM** (veja `MIGRACAO_COMPLETA.md`)

---

## 📋 O que será criado?

### 11 Tabelas:

1. **users** - Usuários do sistema
2. **numbers** - Números da rifa (1-1000)
3. **extra_number_requests** - Solicitações de números extras
4. **draw_results** - Resultados dos sorteios
5. **audit_logs** - Logs de auditoria
6. **payment_proofs** - Comprovantes de pagamento
7. **raffles** - Sistema de rifas múltiplas
8. **live_raffles** - Rifas ao vivo
9. **profiles** - Perfis de usuários
10. **live_games** - Jogos ao vivo (Resta Um)
11. **live_participants** - Participantes de jogos ao vivo

### 2 Storage Buckets:

1. **prize-images** - Imagens dos prêmios (5MB)
2. **payment-proofs** - Comprovantes de pagamento (5MB)

### Segurança:

- ✅ Row Level Security (RLS) em todas as tabelas
- ✅ Políticas de acesso configuradas
- ✅ Usuário admin padrão criado

---

## 👤 Usuário Admin Padrão

Após aplicar as migrações, você terá:

- **Email:** `admin@zkpremios.com`
- **Senha:** `admin123`

⚠️ **IMPORTANTE:** Altere a senha após o primeiro login!

---

## 📁 Estrutura de Arquivos

```
supabase/
├── migrations/              # Todas as migrações SQL
│   ├── 20250911150206_tiny_desert.sql
│   ├── 20250911160228_yellow_peak.sql
│   ├── ... (16 migrações ao total)
│   ├── 20250101_create_raffles_table.sql       ⭐ NOVA
│   ├── 20250102_create_live_raffles_table.sql  ⭐ NOVA
│   └── 20250103_create_profiles_table.sql      ⭐ NOVA
├── apply-migrations.sh      # Script de aplicação (Linux/Mac)
├── apply-all-migrations.js  # Script de aplicação (Node.js)
├── MIGRACAO_COMPLETA.md    # Guia detalhado completo
└── README.md               # Este arquivo
```

---

## 🔍 Verificar Migrações Aplicadas

```bash
# Ver status das migrações
supabase migration list

# Ver detalhes do banco
supabase db status
```

---

## 🆘 Problemas Comuns

### "Supabase CLI not found"

```bash
npm install -g supabase
```

### "Project not linked"

```bash
supabase link --project-ref SEU_PROJECT_ID
```

### "Permission denied" ao executar script

```bash
chmod +x apply-migrations.sh
```

### Erro nas migrações

Consulte o guia detalhado: `MIGRACAO_COMPLETA.md`

---

## 📚 Documentação Completa

Para informações detalhadas sobre:
- Estrutura completa das tabelas
- Ordem exata de execução
- Políticas de segurança
- Troubleshooting

👉 Consulte: **[MIGRACAO_COMPLETA.md](./MIGRACAO_COMPLETA.md)**

---

## ✅ Checklist Rápido

- [ ] Supabase CLI instalado
- [ ] Projeto linkado
- [ ] Migrações aplicadas (`supabase db push`)
- [ ] Login com admin funciona
- [ ] Tabelas criadas no dashboard
- [ ] Storage buckets criados

---

## 🎉 Pronto!

Após aplicar as migrações, seu sistema está completo e pronto para uso!

**Próximos passos:**
1. Fazer login com o usuário admin
2. Alterar a senha padrão
3. Criar sua primeira rifa
4. Testar o sistema completo

---

**Dúvidas?** Consulte `MIGRACAO_COMPLETA.md` ou os comentários dentro dos arquivos `.sql`

