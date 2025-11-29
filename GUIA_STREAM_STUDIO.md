# 🎬 Stream Studio - Sistema de Controle de Transmissão Profissional

## Visão Geral

O **Stream Studio** é um sistema completo de controle de transmissão ao vivo similar ao OBS Studio, integrado ao Agora.io, desenvolvido especificamente para transmissões de jogos de futebol do Cruzeiro com suporte a logos de patrocinadores e overlays profissionais.

## ✨ Funcionalidades Principais

### 1. **Gerenciamento de Cenas (Scenes)**
- Crie múltiplas cenas para diferentes momentos da transmissão
- Duplicar cenas para reutilizar configurações
- Alternar entre cenas durante a transmissão ao vivo
- Preview de cenas antes de enviar ao programa

### 2. **Fontes (Sources) Profissionais**
- **Imagens**: Logos, banners, patrocinadores
- **Texto**: Mensagens, títulos, legendas customizáveis
- **Placar**: Placar do jogo em tempo real (Cruzeiro × Adversário)
- **Logos de Patrocinadores**: Integração de logos de sponsors
- **Câmera**: Transmissão da webcam ou câmera externa
- **Tela**: Compartilhamento de tela
- **Vídeo**: Reprodução de vídeos

### 3. **Editor Visual de Fontes**
- Edição completa de posição (X, Y)
- Controle de tamanho (largura × altura)
- Ajuste de opacidade (0-100%)
- Gerenciamento de camadas (Z-Index)
- Configurações específicas por tipo:
  - **Texto**: Fonte, cor, tamanho, alinhamento, cor de fundo
  - **Placar**: Pontuação em tempo real, nome dos times
  - **Imagens**: Upload de arquivos ou URL

### 4. **Controle de Transmissão**
- **Preview**: Visualize a cena antes de enviar ao vivo
- **Programa**: Cena atual sendo transmitida ao vivo
- Botão "Enviar ao PROGRAMA" para alternar cenas suavemente

### 5. **Biblioteca de Fontes**
- Templates prontos para uso rápido
- Acesso rápido a logos e patrocinadores
- Arrastar e soltar para adicionar à cena

## 🚀 Como Usar

### Passo 1: Criar uma Transmissão

1. Acesse **Admin Dashboard** → **Transmissão ao Vivo**
2. Clique em **"Criar Nova Transmissão"**
3. Preencha:
   - **Título**: Ex: "Cruzeiro × Corinthians - Brasileirão 2025"
   - **Descrição**: Informações sobre o jogo
   - **Nome do Link**: URL amigável (ex: `cruzeiro-x-corinthians`)
4. Clique em **"Criar Transmissão"**

### Passo 2: Configurar o Stream Studio

1. Na página da transmissão, clique no botão **"Stream Studio"** (roxo)
2. O Studio abrirá em tela cheia com interface profissional

### Passo 3: Criar Cenas

1. No painel lateral direito, seção **"CENAS"**
2. Clique no ícone **+** para adicionar nova cena
3. Nomeie a cena (ex: "Pré-Jogo", "Durante o Jogo", "Intervalo", "Patrocinadores")
4. Clique em **"Criar"**

**Dica**: Crie várias cenas para diferentes momentos:
- **Cena 1**: Logo do Cruzeiro + Patrocinadores
- **Cena 2**: Placar + Transmissão do jogo
- **Cena 3**: Somente patrocinadores (para intervalo)
- **Cena 4**: Agradecimentos finais

### Passo 4: Adicionar Fontes às Cenas

1. Selecione a cena desejada (clique nela)
2. Na seção **"FONTES"**, clique no ícone **+**
3. Escolha o tipo de fonte:
   - **Imagem**: Para logos e banners
   - **Logo/Patrocinador**: Para logos de sponsors
   - **Texto**: Para mensagens e títulos
   - **Placar**: Para mostrar o placar do jogo
4. Configure a fonte:
   - **Nome**: Ex: "Logo Cruzeiro", "Patrocinador 1"
   - **Arquivo**: Faça upload da imagem
   - Ou **URL**: Cole o link da imagem
5. Clique em **"Adicionar"**

### Passo 5: Editar e Posicionar Fontes

**Método 1: Duplo Clique**
1. Dê **duplo clique** na fonte na lista
2. O editor visual abrirá

**Método 2: Botão Editar**
1. Clique no ícone de **engrenagem** (⚙️) na fonte
2. O editor visual abrirá

**No Editor Visual:**
- **Posição**: Ajuste X e Y em pixels
- **Tamanho**: Defina largura e altura
- **Opacidade**: Arraste o slider (0-100%)
- **Camada**: Defina qual fonte fica em cima (Z-Index)
- **Configurações Específicas**:
  - Texto: Cor, tamanho da fonte, alinhamento
  - Placar: Pontuação dos times em tempo real

Clique em **"Salvar"** quando terminar.

### Passo 6: Organizar Fontes

- **Ocultar/Mostrar**: Clique no ícone de olho (👁️) para ocultar temporariamente
- **Excluir**: Clique no ícone da lixeira (🗑️)
- **Reordenar**: Use o Z-Index no editor para controlar camadas

### Passo 7: Preview e Programa

1. **Preview** (superior): Mostra a cena selecionada antes de enviar ao vivo
2. **Programa** (inferior): Mostra o que está sendo transmitido AO VIVO

**Para enviar uma cena ao vivo:**
1. Selecione a cena no Preview
2. Ajuste as fontes conforme necessário
3. Clique em **"Enviar ao PROGRAMA"**
4. A cena será ativada na transmissão ao vivo instantaneamente

### Passo 8: Durante a Transmissão

**Atualizando Placar:**
1. Dê duplo clique no placar
2. Atualize os números dos gols
3. Clique em **"Salvar"**
4. O placar é atualizado em tempo real para todos os espectadores

**Alternando Cenas:**
- Selecione a próxima cena no painel
- Confira no Preview
- Clique em **"Enviar ao PROGRAMA"**
- Transição suave entre cenas

**Mostrando/Ocultando Patrocinadores:**
- Clique no ícone de olho (👁️) para mostrar/ocultar sponsors rapidamente
- Útil para alternar entre momentos do jogo e intervalos comerciais

## 💡 Dicas Profissionais

### Para Jogos de Futebol do Cruzeiro:

1. **Cena de Abertura**:
   - Logo do Cruzeiro (grande, centralizado)
   - Logos dos patrocinadores (canto inferior)
   - Texto: "AO VIVO" ou "Transmissão Oficial"

2. **Cena Durante o Jogo**:
   - Placar (canto superior)
   - Logo do Cruzeiro (pequeno, canto)
   - Patrocinador principal (canto inferior)

3. **Cena de Intervalo**:
   - Logos de todos os patrocinadores (rotação ou grid)
   - Texto: "INTERVALO" ou "Voltamos já"

4. **Cena de Encerramento**:
   - Resultado final (grande e visível)
   - Agradecimentos aos patrocinadores
   - Redes sociais do Cruzeiro

### Posicionamento Recomendado:

- **Placar**: Canto superior esquerdo ou centro superior (0-100px do topo)
- **Logos pequenos**: Cantos (20-50px das bordas)
- **Patrocinadores**: Rodapé (bottom: 50-100px) ou laterais
- **Textos importantes**: Centro da tela
- **Logo Cruzeiro**: Canto superior direito (posição fixa)

### Camadas (Z-Index):

- **Placar**: 100 (sempre visível, em cima de tudo)
- **Textos**: 90
- **Logos de patrocinadores**: 80
- **Banners de fundo**: 10-20
- **Vídeo do jogo**: 0 (fundo)

## 📊 Recursos Avançados

### Opacidade para Transições Suaves

Use opacidade para criar efeitos:
- **100%**: Totalmente visível
- **80-90%**: Suavemente visível (bom para overlays)
- **50-60%**: Marca d'água
- **0%**: Invisível (use o olho 👁️ ao invés)

### Múltiplos Patrocinadores

Crie uma cena dedicada para rotação de patrocinadores:
1. Adicione todos os logos como fontes separadas
2. Oculte todos inicialmente
3. Durante a transmissão, mostre/oculte um de cada vez
4. Ou crie cenas diferentes, cada uma com um sponsor diferente

### Texto Dinâmico

Use textos para informações que mudam:
- Avisos importantes
- Estatísticas do jogo
- Mensagens dos espectadores VIP
- Contagem regressiva

## 🛠️ Troubleshooting

### "Fonte não aparece no Preview"
- ✅ Verifique se a fonte está **visível** (ícone do olho verde)
- ✅ Confirme que a **opacidade** não está em 0%
- ✅ Verifique o **Z-Index** (pode estar atrás de outra fonte)
- ✅ Confirme a **posição** (pode estar fora da tela visível)

### "Mudanças não aparecem na transmissão"
- ✅ Salve as alterações no editor
- ✅ Clique em **"Enviar ao PROGRAMA"** para ativar a cena
- ✅ Aguarde alguns segundos para sincronização

### "Imagem não carrega"
- ✅ Use formatos suportados: JPG, PNG, GIF, WebP
- ✅ Verifique se a URL da imagem está acessível
- ✅ Tente fazer upload direto do arquivo

### "Preview e Programa não sincronizam"
- ✅ Isso é normal! O Preview mostra a próxima cena
- ✅ Use "Enviar ao PROGRAMA" para sincronizar

## 🎯 Melhores Práticas

1. **Prepare tudo antes de iniciar a transmissão**
   - Crie todas as cenas
   - Adicione todos os logos e patrocinadores
   - Teste as transições

2. **Tenha cenas de backup**
   - Crie cenas extras para problemas técnicos
   - Mantenha uma cena "Voltamos já"

3. **Use nomes descritivos**
   - "Placar Time A × Time B"
   - "Logo Patrocinador Principal"
   - Facilita encontrar rapidamente

4. **Duplique cenas similares**
   - Use o botão de duplicar (📋)
   - Economiza tempo de configuração

5. **Mantenha organizado**
   - Delete fontes não utilizadas
   - Agrupe patrocinadores em cenas específicas

## 🎓 Tutoriais em Vídeo (Recomendado)

Para aprender melhor, recomendamos assistir tutoriais sobre OBS Studio no YouTube. Nosso Stream Studio funciona de forma muito similar!

Busque por:
- "Como usar OBS Studio"
- "OBS Studio para iniciantes"
- "Overlay no OBS Studio"

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique este guia
2. Entre em contato com o administrador do sistema
3. Consulte a documentação do Agora.io para problemas de transmissão

---

**Desenvolvido para ZK Prêmios - Transmissões Profissionais do Cruzeiro** ⚽🔵⚪

Última atualização: Novembro 2025
