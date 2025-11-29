# 🎥 Como Fazer Transmissão Completa com Stream Studio

## 📋 Fluxo Completo da Transmissão

### 1. **O Que Você Controla no Stream Studio**

O **Stream Studio** é como o painel de controle do OBS. Você configura:

✅ **Logos de Patrocinadores** - Posição, tamanho, quando aparecem
✅ **Placar do Jogo** - Atualização em tempo real
✅ **Textos** - Mensagens, avisos, títulos
✅ **Overlays** - Elementos gráficos sobre o vídeo

### 2. **O Que o Agora.io Transmite**

O **Agora.io** (já configurado no VideoStream) transmite:

✅ **Vídeo do Jogo** - Compartilhamento de tela do jogo
✅ **Sua Câmera** - Webcam do narrador
✅ **Áudio** - Narração e som do jogo

## 🚀 Passo a Passo Completo

### **ANTES DA TRANSMISSÃO (Preparação)**

#### Passo 1: Criar a Transmissão
1. Acesse **Admin Dashboard** → **Transmissão ao Vivo**
2. Clique em **"Criar Nova Transmissão"**
3. Preencha:
   - Título: "Cruzeiro × Corinthians - Brasileirão"
   - Descrição: "Transmissão ao vivo do jogo"
   - Link: `cruzeiro-x-corinthians`
4. Clique em **"Criar Transmissão"**

#### Passo 2: Configurar Cenas no Stream Studio
1. Clique no botão **"Stream Studio"** (roxo)
2. Clique no ícone **📋 Templates**
3. Aplique os templates:
   - ✅ **Pré-Jogo** (abertura)
   - ✅ **Durante o Jogo** (placar + logos)
   - ✅ **Intervalo** (patrocinadores)
   - ✅ **Pós-Jogo** (resultado final)

#### Passo 3: Adicionar Logos e Imagens
Para cada cena criada:
1. **Duplo clique** em cada fonte
2. Faça **upload das imagens**:
   - Logo do Cruzeiro
   - Logos dos patrocinadores
   - Banners
3. **Ajuste posição e tamanho** arrastando
4. Clique em **"Salvar"**

#### Passo 4: Testar no Preview
1. Selecione cada cena (clique nela)
2. Veja como fica no **Preview**
3. Ajuste posições se necessário
4. **NÃO clique** em "Enviar ao PROGRAMA" ainda!

### **DURANTE A TRANSMISSÃO (Ao Vivo)**

#### Passo 5: Iniciar Transmissão
1. **FECHE** o Stream Studio (X)
2. Volte para a página de transmissão
3. Clique em **"Iniciar Transmissão"**
4. Aguarde carregar...

#### Passo 6: Compartilhar Jogo/Câmera
No VideoStream, você verá botões:

**Opção A: Compartilhar Tela (Jogo)**
1. Clique no botão **🖥️ Tela**
2. Selecione a janela/tela do jogo
3. Clique em **"Compartilhar"**
4. O jogo aparece na transmissão!

**Opção B: Usar Câmera**
1. Clique no botão **📷 Câmera**
2. Permite acesso à webcam
3. Sua câmera aparece na transmissão!

**Opção C: Vídeo Externo**
1. Clique no botão **🎬 Vídeo**
2. Cole a URL do vídeo
3. Vídeo reproduz na transmissão!

#### Passo 7: Ativar Cena de Abertura
1. Abra o **Stream Studio** novamente
2. Selecione cena **"Pré-Jogo"**
3. Confira no Preview
4. Clique em **"Enviar ao PROGRAMA"** 🚀
5. **Logo do Cruzeiro + Patrocinadores aparecem SOBRE o vídeo!**

#### Passo 8: Alternar para Cena do Jogo
Quando o jogo começar:
1. No Stream Studio, selecione **"Durante o Jogo"**
2. Veja no Preview: Placar + Logo pequeno
3. Clique em **"Enviar ao PROGRAMA"**
4. **Placar e logos aparecem automaticamente!**

#### Passo 9: Atualizar Placar em Tempo Real
Quando houver gol:
1. No Stream Studio, **duplo clique** no Placar
2. Atualize a pontuação:
   - Cruzeiro: 1
   - Adversário: 0
3. Clique em **"Salvar"**
4. **Placar atualiza AO VIVO para TODOS os espectadores!** ⚡

#### Passo 10: Intervalo
No meio-tempo:
1. Selecione cena **"Intervalo"**
2. Clique em **"Enviar ao PROGRAMA"**
3. **Patrocinadores em destaque aparecem!**

#### Passo 11: Segundo Tempo
Quando voltar:
1. Selecione cena **"Durante o Jogo"**
2. Clique em **"Enviar ao PROGRAMA"**
3. **Volta pro placar e jogo!**

#### Passo 12: Finalizar
Após o jogo:
1. Atualize o placar final
2. Selecione cena **"Pós-Jogo"**
3. Clique em **"Enviar ao PROGRAMA"**
4. **Resultado final + Agradecimentos aparecem!**
5. Clique em **"Encerrar Transmissão"**

## 🎯 O Que Acontece nos Bastidores

### Quando você clica "Enviar ao PROGRAMA":

```
┌─────────────────────────────────────┐
│   STREAM STUDIO (Você controla)    │
│   Cena "Durante o Jogo" ativa       │
└──────────────┬──────────────────────┘
               │
               ↓ Salva no Supabase
┌─────────────────────────────────────┐
│      SUPABASE (Banco de Dados)      │
│   stream_scenes.is_active = true    │
│   stream_sources (logos, placar)    │
└──────────────┬──────────────────────┘
               │
               ↓ Sincroniza em Tempo Real
┌─────────────────────────────────────┐
│   ADMIN + ESPECTADORES (Viewers)    │
│   useStreamStudioSync() detecta     │
│   StreamOverlay renderiza overlays  │
└──────────────┬──────────────────────┘
               │
               ↓ Aparece sobre
┌─────────────────────────────────────┐
│      VIDEOSTREAM (Agora.io)         │
│   Vídeo do jogo + Câmera + Áudio    │
│   ⬆️ Overlays em cima do vídeo      │
└─────────────────────────────────────┘
```

### Resultado para os espectadores:

```
┌──────────────────────────────────────┐
│  🏆 Cruzeiro 2 × 1 Corinthians 🏆   │ ← Placar (overlay)
│  ┌────────────────────────────────┐  │
│  │                                │  │
│  │    [Vídeo do Jogo Aqui]       │  │ ← Vídeo (Agora.io)
│  │                                │  │
│  └────────────────────────────────┘  │
│  Logo 🔵 Cruzeiro                    │ ← Logo (overlay)
│  [Patrocinador]                      │ ← Sponsor (overlay)
└──────────────────────────────────────┘
```

## 🔧 Recursos Disponíveis no VideoStream

### Botões de Controle (já implementados):

1. **📷 Câmera**
   - Ativa/desativa webcam
   - Aparece na transmissão

2. **🖥️ Compartilhar Tela**
   - Compartilha tela do computador
   - Ideal para transmitir o jogo

3. **🎤 Áudio**
   - Controla microfone
   - Mute/Unmute

4. **🔊 Volume**
   - Ajusta volume do jogo
   - Ajusta volume do microfone

5. **🔴 Gravar**
   - Grava a transmissão
   - Salva em formato WebM/MP4

## 💡 Dicas Profissionais

### Para Transmitir Jogo de Futebol:

1. **Preparação (30 min antes):**
   - Configure todas as cenas no Stream Studio
   - Adicione todos os logos de patrocinadores
   - Teste o compartilhamento de tela
   - Teste o microfone e áudio

2. **5 minutos antes:**
   - Inicie a transmissão
   - Ative cena "Pré-Jogo"
   - Compartilhe tela do jogo
   - Teste áudio e vídeo

3. **Durante o jogo:**
   - Alterne para cena "Durante o Jogo"
   - Atualize placar a cada gol
   - No intervalo, mostre patrocinadores

4. **Após o jogo:**
   - Mostre resultado final
   - Agradeça patrocinadores
   - Encerre transmissão

### Múltiplas Fontes de Vídeo:

**Cenário: Quero mostrar jogo + minha câmera ao mesmo tempo**

Solução:
1. Compartilhe tela do jogo (vídeo principal)
2. No Stream Studio, adicione uma fonte "Câmera"
3. Posicione no canto (exemplo: canto inferior direito)
4. Redimensione para ficar pequena (200×150px)
5. Envie ao PROGRAMA
6. **Resultado:** Jogo tela cheia + sua câmera em PiP!

## 🎬 Workflow Recomendado

### Template de Transmissão de Jogo:

```
⏰ -30min: Preparar cenas e logos
⏰ -5min:  Iniciar transmissão + Cena Pré-Jogo
⏰ 0min:   Início do jogo → Cena Durante o Jogo
⏰ 45min:  Intervalo → Cena Intervalo
⏰ 50min:  Volta → Cena Durante o Jogo
⏰ 90min:  Final → Cena Pós-Jogo
⏰ +5min:  Encerrar transmissão
```

## 🆘 Troubleshooting

### "Os overlays não aparecem na transmissão"
✅ Certifique-se de clicar em "Enviar ao PROGRAMA"
✅ Verifique se a cena está ativa (tem "LIVE" na label)
✅ Confirme que as fontes estão visíveis (olho verde)

### "Placar não atualiza"
✅ Edite o placar (duplo clique)
✅ Clique em "Salvar"
✅ Aguarde 1-2 segundos (sincronização em tempo real)

### "Vídeo do jogo não aparece"
✅ Clique no botão 🖥️ "Compartilhar Tela"
✅ Selecione a janela/tela correta
✅ Permita o compartilhamento no navegador

### "Espectadores não veem os overlays"
✅ Os overlays sincronizam automaticamente via Supabase Realtime
✅ Pode levar 1-2 segundos para aparecer
✅ Peça para espectadores atualizarem a página se necessário

## 🎉 Resultado Final

Quando tudo estiver configurado, os espectadores verão:

✅ **Vídeo do jogo** em alta qualidade (Agora.io)
✅ **Placar atualizado** em tempo real
✅ **Logos de patrocinadores** posicionados profissionalmente
✅ **Textos e avisos** quando necessário
✅ **Transições suaves** entre cenas

**Tudo sincronizado automaticamente para todos os espectadores!** 🚀⚽🔵⚪

---

**Desenvolvido para ZK Prêmios - Transmissões Profissionais do Cruzeiro**

Versão 2.0 - Com Stream Studio Integrado
Última atualização: Novembro 2025
