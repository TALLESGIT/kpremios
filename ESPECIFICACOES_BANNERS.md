# Especificações de Tamanhos de Banners - ZK Premios

## 📐 Banner do Próximo Jogo (banner_url) - PRINCIPAL

Este é o banner mais importante, usado na HomePage para exibir o próximo jogo do Cruzeiro.

### Especificações Técnicas:
- **Largura máxima do container:** 896px (`max-w-4xl`)
- **Largura útil (com padding):** ~864px (896px - 32px de padding)
- **Altura mínima:** 150px (`min-h-[150px]`)
- **Comportamento:** `object-cover` (imagem cobre todo o espaço, pode cortar)
- **Aspect Ratio:** Não fixo (flexível)
- **Tamanho recomendado para criar arte:**
  - **Largura:** 1920px (para alta qualidade/retina)
  - **Altura:** 1080px (proporção 16:9)
  - **Proporção:** 16:9 é a mais comum e funciona bem
  - **Alternativa (mais largo):** 1600px x 600px (proporção ~2.67:1)

### Onde é usado:
- HomePage: Banner principal do próximo jogo
- É a imagem que aparece nas artes promocionais que você mostrou

---

## 📊 Preview no Admin (AdminZkTVPage)

### Especificações Técnicas:
- **Aspect Ratio:** 16:9 (`aspect-video`)
- **Altura máxima:** 200px (`max-h-[200px]`)
- **Largura calculada:** ~355px (200px * 16/9)
- **Uso:** Apenas preview no painel admin

---

## 🎨 AdvertisementCarousel (Banners de Publicidade)

### Especificações Técnicas:
- **Largura máxima:** 896px (`max-w-4xl`)
- **Aspect Ratio:** 3:1 (`aspect-[3/1]`)
- **Altura calculada:** ~298px (896px / 3)
- **Tamanho recomendado para criar arte:**
  - **Largura:** 1920px
  - **Altura:** 640px (proporção 3:1)

---

## ✅ Recomendações Finais

### Para o Banner do Próximo Jogo (MAIS IMPORTANTE):

**Tamanho recomendado: 1920px x 1080px (16:9)**

**Motivos:**
1. ✅ Proporção 16:9 é padrão e funciona bem em todos os dispositivos
2. ✅ 1920px de largura garante alta qualidade em telas Retina
3. ✅ Compatível com o comportamento `object-cover` usado no código
4. ✅ Altura de 1080px é suficiente para mostrar todos os detalhes
5. ✅ Funciona perfeitamente no container de 896px (será redimensionado automaticamente)

**Áreas de Segurança:**
- Mantenha textos importantes nas áreas centrais
- Evite colocar informações críticas muito próximas das bordas (últimos 10% de cada lado)
- A parte inferior terá um overlay escuro, então textos devem estar visíveis mesmo com o overlay

### Formato de Arquivo:
- **Formato:** PNG ou JPG
- **Qualidade:** Alta (JPG: 90-95%, PNG: sem compressão)
- **Peso:** Idealmente abaixo de 500KB para carregamento rápido

---

## 🎯 Banners de Patrocinadores (AdvertisementCarousel)

Estes são os banners de patrocinadores/anúncios que aparecem no carrossel da HomePage.

### Especificações Técnicas:
- **Largura máxima do container:** 896px (`max-w-4xl`)
- **Largura útil (com padding):** ~864px (896px - 32px de padding)
- **Aspect Ratio:** 3:1 (`aspect-[3/1]`) - **FIXO**
- **Altura calculada:** ~298px (896px / 3)
- **Comportamento:** `object-contain` (imagem mantém proporções, não corta)
- **Tamanho recomendado para criar arte:**
  - **Largura:** 1920px
  - **Altura:** 640px (proporção 3:1 exata)
  - **Proporção:** 3:1 (obrigatório)

### Onde é usado:
- HomePage: Carrossel de anúncios/patrocinadores
- Componente: `AdvertisementCarousel`
- Gerenciamento: AdminBannersPage (painel administrativo)

### Características importantes:
- ✅ **Proporção 3:1 é OBRIGATÓRIA** - o código usa `aspect-[3/1]` fixo
- ✅ Usa `object-contain` (diferente do banner do jogo que usa `object-cover`)
- ✅ A imagem NÃO será cortada - será ajustada mantendo proporções
- ✅ Funciona como carrossel (múltiplos banners podem ser adicionados)
- ✅ Auto-play: 5 segundos entre slides

### Áreas de Segurança:
- Mantenha conteúdo importante no centro (70% central)
- Evite textos críticos nos últimos 15% de cada borda
- A imagem será centralizada automaticamente se for maior/menor que o espaço

---

## 📱 Responsividade

Os banners são responsivos:
- **Mobile:** Largura total da tela (menos padding)
- **Tablet:** Largura máxima de 896px
- **Desktop:** Largura máxima de 896px

**Banner do Jogo:**
- O `object-cover` garante que a imagem sempre preencha o espaço, cortando se necessário para manter a proporção.

**Banner de Patrocinadores:**
- O `object-contain` garante que a imagem seja exibida completamente sem cortes, mantendo a proporção 3:1.

