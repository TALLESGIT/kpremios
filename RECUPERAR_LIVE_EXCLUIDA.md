# 🚨 RECUPERAR LIVE EXCLUÍDA COM PARTICIPANTES

## ⚠️ SITUAÇÃO CRÍTICA

Você excluiu uma live que tinha um bolão ativo com participantes. Devido ao `ON DELETE CASCADE`, todos os participantes foram excluídos automaticamente quando o jogo foi deletado.

---

## ✅ SOLUÇÕES PARA RECUPERAR

### 1. **Verificar se Há Dados Recuperáveis** (FAÇA ISSO PRIMEIRO!)

Execute o script SQL em `supabase/scripts/VERIFICAR_LIVE_EXCLUIDA.sql` no SQL Editor do Supabase:

1. Acesse: https://app.supabase.com
2. Vá em: **SQL Editor**
3. Cole o conteúdo do arquivo `VERIFICAR_LIVE_EXCLUIDA.sql`
4. Execute e veja os resultados

**O que procurar:**
- Participantes órfãos (sem `game_id` válido) - podem ser recuperados!
- Jogos excluídos recentemente
- Lista de participantes que estavam no jogo

---

### 2. **Restaurar do Backup do Supabase** (MELHOR OPÇÃO)

O Supabase mantém backups automáticos diários:

1. Acesse: https://app.supabase.com
2. Vá em: **Settings** → **Database** → **Backups**
3. Procure um backup **anterior à exclusão**
4. Clique em **Restore** ou **Download**
5. Se restaurar, todos os dados voltarão

⚠️ **ATENÇÃO:** Restaurar um backup vai **sobrescrever** todos os dados atuais. Use apenas se não houver dados importantes criados depois da exclusão.

---

### 3. **Recriar o Jogo Manualmente** (Se tiver a lista de participantes)

Se você tiver a lista de participantes (nome, número, WhatsApp), podemos:

1. Recriar o jogo com os mesmos dados
2. Adicionar os participantes novamente
3. Restaurar o estado do jogo

**Para isso, me forneça:**
- Título do jogo
- Descrição
- Lista de participantes (nome, número da sorte, WhatsApp)

---

## 🛡️ PROTEÇÕES ADICIONADAS

Para evitar que isso aconteça novamente, adicionei:

1. ✅ **Confirmação obrigatória** antes de excluir jogos com participantes
2. ✅ **Aviso de quantos participantes serão excluídos**
3. ✅ **Bloqueio de exclusão** se o jogo estiver ativo ou tiver participantes

---

## 📋 CHECKLIST DE RECUPERAÇÃO

- [ ] Execute o script `VERIFICAR_LIVE_EXCLUIDA.sql`
- [ ] Verifique se há participantes órfãos recuperáveis
- [ ] Verifique backups disponíveis no Supabase
- [ ] Decida: restaurar backup OU recriar manualmente
- [ ] Se recriar, me forneça a lista de participantes

---

## 🆘 SE NADA FUNCIONAR

Se não conseguir recuperar os dados:

1. **Contate o suporte do Supabase** - eles podem ter backups mais antigos
2. **Verifique logs do sistema** - pode haver registro dos participantes
3. **Considere recriar o jogo** - se tiver a lista de participantes

---

**AÇÃO IMEDIATA:** Execute o script SQL primeiro para ver o que ainda existe no banco!
