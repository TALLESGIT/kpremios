# 📸 Como Funciona a Extração Automática de Dados de Tabela

## 🎯 Conceito

A ideia é: **o admin tira um print/screenshot da tabela de classificação atualizada e o sistema extrai automaticamente todos os dados usando OCR (Optical Character Recognition)**.

---

## 🔄 Fluxo Completo

### **1. Admin tira print da tabela**
- Acessa o site oficial (ex: CBF, Globo Esporte, etc.)
- Tira um screenshot da tabela de classificação
- Faz upload da imagem no sistema

### **2. Sistema processa a imagem**
- Upload da imagem para o Supabase Storage
- Envia para API de OCR (Google Vision API ou Tesseract.js)
- Extrai texto e estrutura da tabela

### **3. Sistema identifica os dados**
- Detecta colunas: Posição, Time, Pontos, Jogos, Vitórias, Empates, Derrotas, GP, GC, SG
- Identifica cada linha (cada time)
- Extrai os valores numéricos

### **4. Sistema salva automaticamente**
- Limpa a tabela atual da competição
- Insere todos os times com os dados extraídos
- Marca automaticamente o Cruzeiro (se detectar "Cruzeiro" no nome)

---

## 🛠️ Tecnologias Necessárias

### **Opção 1: Google Cloud Vision API** (Recomendado - Melhor qualidade)
- **Custo**: ~$1.50 por 1.000 imagens
- **Precisão**: Muito alta (95%+)
- **Reconhece**: Texto, tabelas, estrutura
- **Integração**: Via Edge Function no Supabase

### **Opção 2: Tesseract.js** (Gratuito - Menor qualidade)
- **Custo**: Gratuito (client-side)
- **Precisão**: Boa (80-90%)
- **Reconhece**: Texto básico
- **Integração**: Biblioteca JavaScript no frontend

### **Opção 3: Azure Computer Vision** (Alternativa)
- **Custo**: Similar ao Google
- **Precisão**: Muito alta
- **Reconhece**: Texto, tabelas

---

## 📋 Estrutura de Dados Extraída

De uma tabela como esta:

```
Pos | Time          | Pts | J  | V  | E  | D  | GP | GC | SG
1   | Flamengo      | 45  | 15 | 14 | 3  | 0  | 38 | 12 | 26
2   | Palmeiras     | 42  | 15 | 13 | 3  | 1  | 35 | 15 | 20
3   | Cruzeiro      | 40  | 15 | 12 | 4  | 1  | 32 | 14 | 18
...
```

O sistema extrairia:

```json
[
  {
    "position": 1,
    "team": "Flamengo",
    "points": 45,
    "played": 15,
    "won": 14,
    "drawn": 3,
    "lost": 0,
    "goals_for": 38,
    "goals_against": 12
  },
  {
    "position": 2,
    "team": "Palmeiras",
    "points": 42,
    "played": 15,
    "won": 13,
    "drawn": 3,
    "lost": 1,
    "goals_for": 35,
    "goals_against": 15
  },
  {
    "position": 3,
    "team": "Cruzeiro",
    "points": 40,
    "played": 15,
    "won": 12,
    "drawn": 4,
    "lost": 1,
    "goals_for": 32,
    "goals_against": 14,
    "is_cruzeiro": true
  }
]
```

---

## 🎨 Interface do Usuário

### **Botão "Importar de Imagem"**
- Na página `/admin/zk-tv` → Aba "Tabela"
- Botão ao lado de "Novo Time"
- Abre modal com:
  - Upload de imagem
  - Preview da imagem
  - Seleção de competição
  - Botão "Extrair e Salvar"

### **Processo Visual**
1. Admin clica em "Importar de Imagem"
2. Faz upload do screenshot
3. Sistema mostra preview
4. Admin seleciona a competição
5. Clica em "Extrair e Salvar"
6. Sistema processa (mostra loading)
7. Mostra preview dos dados extraídos
8. Admin confirma ou ajusta
9. Sistema salva tudo automaticamente

---

## ⚙️ Implementação Técnica

### **1. Edge Function: `extract-table-data`**
```typescript
// Recebe: imagem (base64 ou URL)
// Processa: Google Vision API
// Retorna: Array de times com dados
```

### **2. Serviço Frontend: `tableExtractionService.ts`
```typescript
// Upload imagem → Supabase Storage
// Chama Edge Function
// Recebe dados extraídos
// Valida e formata
```

### **3. Componente: `TableImageImporter.tsx`
```typescript
// Interface de upload
// Preview da imagem
// Preview dos dados extraídos
// Confirmação e salvamento
```

---

## ✅ Vantagens

1. **Rapidez**: Atualiza toda a tabela em segundos
2. **Precisão**: Menos erros manuais
3. **Conveniência**: Não precisa digitar tudo
4. **Atualização**: Pode atualizar várias vezes por rodada

---

## ⚠️ Desafios e Limitações

1. **Qualidade da imagem**: Precisa ser clara e legível
2. **Formato da tabela**: Funciona melhor com tabelas padronizadas
3. **Nomes de times**: Pode confundir nomes similares
4. **Custo**: Google Vision API tem custo (mas baixo)

---

## 💡 Melhorias Futuras

1. **Aprendizado**: Sistema aprende com correções manuais
2. **Múltiplas fontes**: Suporta diferentes sites/formato
3. **Validação automática**: Compara com dados anteriores
4. **Histórico**: Salva versões anteriores da tabela

---

## 🚀 Próximos Passos

1. Implementar upload de imagem
2. Integrar Google Vision API (ou Tesseract.js)
3. Criar parser para estrutura de tabela
4. Implementar validação e correção manual
5. Adicionar interface de importação

---

## 📝 Notas

- **Google Vision API** é a melhor opção para qualidade
- **Tesseract.js** é gratuito mas requer mais processamento
- Pode começar com Tesseract.js e migrar para Google depois
- Sistema deve sempre permitir correção manual após extração

