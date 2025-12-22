# 📊 Como Configurar as Tabelas de Classificação

## 🎯 Onde Configurar

### **Página Admin: `/admin/zk-tv`**

1. **Acesse a área administrativa:**
   - Faça login como administrador
   - Vá para `/admin/zk-tv`
   - Clique na aba **"Tabela"** (ícone de troféu)

2. **Selecione a Competição:**
   - No topo da página, há um **dropdown** para selecionar a competição
   - Escolha entre:
     - Campeonato Brasileiro - Série A
     - Copa Conmebol Libertadores
     - Copa do Brasil
     - Campeonato Mineiro
     - Copa Conmebol Sul-Americana

---

## ➕ Como Adicionar Times

1. **Clique em "Novo Time"**
2. **Preencha os dados:**
   - **Competição:** Selecione a competição (já vem pré-selecionada)
   - **Time:** Nome do time
   - **Posição:** Posição na tabela (1º, 2º, 3º...)
   - **Pontos:** Total de pontos
   - **Jogos (PJ):** Partidas jogadas
   - **Vitórias (V):** Número de vitórias
   - **Empates (E):** Número de empates
   - **Derrotas (D):** Número de derrotas
   - **Gols Pró (GP):** Gols marcados
   - **Gols Contra (GC):** Gols sofridos
   - **É o Cruzeiro?:** Marque se for o Cruzeiro (aparecerá destacado)

3. **Clique em "Salvar"**

---

## ✏️ Como Editar Times

1. **Na tabela, clique no ícone de editar** (lápis) ao lado do time
2. **Modifique os dados desejados**
3. **Clique em "Salvar"**

---

## 🗑️ Como Excluir Times

1. **Na tabela, clique no ícone de excluir** (lixeira) ao lado do time
2. **Confirme a exclusão**

---

## 📋 Dicas Importantes

### **Organização por Competição:**
- Cada competição tem sua própria tabela
- Use o dropdown no topo para alternar entre competições
- Ao adicionar um time, ele será salvo na competição selecionada

### **Destaque do Cruzeiro:**
- Sempre marque "É o Cruzeiro?" quando adicionar o Cruzeiro
- O Cruzeiro aparecerá destacado em azul na tabela pública

### **Ordem dos Times:**
- A tabela é ordenada automaticamente por **posição**
- Certifique-se de que as posições estão corretas (1º, 2º, 3º...)

### **Saldo de Gols:**
- O saldo de gols (SG) é calculado automaticamente: GP - GC
- Não precisa preencher manualmente

---

## 🎨 Visualização Pública

### **Onde os Usuários Veem:**
1. **Home Page:** Card "Tabela" → Clica em "VER TABELA"
2. **Página de Competições:** Lista todas as competições de 2026
3. **Página de Tabela:** Mostra a tabela completa da competição selecionada

### **Recursos Visuais:**
- ✅ Cruzeiro destacado em azul
- ✅ Cores por zona (Libertadores, Pré-Libertadores, Rebaixamento)
- ✅ Estatísticas completas (Pts, J, V, E, D, GP, GC, SG)
- ✅ Layout responsivo (mobile e desktop)

---

## 🔄 Atualização de Dados

### **Após cada rodada:**
1. Acesse `/admin/zk-tv` → Aba "Tabela"
2. Selecione a competição
3. Edite os times que jogaram:
   - Atualize pontos, jogos, vitórias, empates, derrotas
   - Atualize gols pró e gols contra
   - Ajuste posições se necessário

### **Importação em Massa:**
- Por enquanto, é necessário adicionar/editar times manualmente
- Futuramente pode ser implementada importação via CSV/Excel

---

## ⚠️ Problemas Comuns

### **Time não aparece na tabela pública:**
- Verifique se a competição está correta
- Verifique se há dados na tabela `cruzeiro_standings` no banco

### **Tabela vazia:**
- Certifique-se de que adicionou times para a competição selecionada
- Verifique se o nome da competição está exatamente igual ao dropdown

### **Cruzeiro não destacado:**
- Marque a opção "É o Cruzeiro?" ao adicionar/editar o time

---

## 📍 Localização no Código

- **Página Admin:** `src/pages/admin/AdminZkTVPage.tsx`
- **Página Pública de Competições:** `src/pages/CompetitionsPage.tsx`
- **Página Pública de Tabela:** `src/pages/StandingsPage.tsx`
- **Banco de Dados:** Tabela `cruzeiro_standings`

---

## ✅ Checklist de Configuração

- [ ] Acessar `/admin/zk-tv`
- [ ] Clicar na aba "Tabela"
- [ ] Selecionar competição no dropdown
- [ ] Adicionar todos os times da competição
- [ ] Marcar "É o Cruzeiro?" para o Cruzeiro
- [ ] Verificar se a tabela aparece na página pública (`/competicoes`)

---

**Pronto!** Agora você sabe como configurar as tabelas para os usuários verem! 🎉

