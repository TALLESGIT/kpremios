# 📢 Sistema de Gerenciamento de Banners

Sistema completo para gerenciar banners e anúncios publicitários na homepage e outras páginas do site.

## 🎯 Funcionalidades

### Para Administradores

1. **Criar Banners**
   - Título e descrição
   - Upload de imagem (URL)
   - Link de redirecionamento
   - Posicionamento (homepage, sidebar, footer)
   - Ordem de exibição
   - Datas de início e fim
   - Ativar/desativar

2. **Gerenciar Banners**
   - Editar banners existentes
   - Excluir banners
   - Ativar/desativar banners
   - Visualizar estatísticas de cliques

3. **Carrossel Automático**
   - Múltiplos banners em slides
   - Transição automática (5 segundos)
   - Navegação manual (setas e dots)
   - Contador de cliques

### Para Usuários

- Visualização automática dos banners ativos
- Carrossel com transição suave
- Clique para acessar o link do anúncio
- Design responsivo

## 📋 Como Usar

### 1. Acessar o Painel de Banners

1. Faça login como administrador
2. Acesse o **Admin Dashboard**
3. Na seção **"ZK TV & Mídia"**, clique em **"Gerenciar Banners"**
4. Ou acesse diretamente: `/admin/banners`

### 2. Criar um Novo Banner

1. Clique em **"Novo Banner"**
2. Preencha os campos:
   - **Título**: Nome do anúncio (obrigatório)
   - **Descrição**: Texto descritivo (opcional)
   - **URL da Imagem**: Link para a imagem do banner
     - Use serviços como Imgur, Cloudinary, ou hospede sua própria imagem
     - Formato recomendado: JPG, PNG, WebP
     - Tamanho recomendado: 1200x400px ou proporção 3:1
   - **Link de Redirecionamento**: URL para onde o usuário será direcionado ao clicar
   - **Posição**: Onde o banner será exibido
     - `homepage`: Homepage (carrossel)
     - `sidebar`: Barra lateral (futuro)
     - `footer`: Rodapé (futuro)
   - **Ordem de Exibição**: Número para ordenar os banners (menor = primeiro)
   - **Data de Início**: Quando o banner começa a ser exibido (opcional)
   - **Data de Fim**: Quando o banner para de ser exibido (opcional)
   - **Banner Ativo**: Checkbox para ativar/desativar

3. Clique em **"Criar Banner"**

### 3. Editar um Banner

1. Na lista de banners, clique em **"Editar"**
2. Modifique os campos desejados
3. Clique em **"Atualizar Banner"**

### 4. Gerenciar Status

- **Ativar/Desativar**: Clique no ícone de olho no card do banner
- **Excluir**: Clique no botão de lixeira (confirmação necessária)

## 🎨 Ideias de Uso

### 1. **Banners de Patrocinadores**
- Imagem do logo do patrocinador
- Link para o site do patrocinador
- Descrição do patrocínio

### 2. **Promoções e Ofertas**
- Banner promocional com imagem chamativa
- Link para página de promoção
- Data de início e fim para campanhas temporárias

### 3. **Eventos e Lives**
- Banner anunciando transmissões ao vivo
- Link para página de live
- Ativar apenas durante o evento

### 4. **Produtos e Serviços**
- Banner de produtos/serviços oferecidos
- Link para página de compra ou mais informações
- Descrição atrativa

### 5. **Parceiros e Afiliados**
- Logo de parceiros
- Link para site do parceiro
- Texto de parceria

## 📊 Estatísticas

O sistema rastreia automaticamente:
- **Contador de Cliques**: Quantas vezes o banner foi clicado
- Visualização disponível no painel de gerenciamento

## 🔧 Estrutura Técnica

### Tabela `advertisements`

```sql
- id: UUID (chave primária)
- title: TEXT (título do banner)
- description: TEXT (descrição opcional)
- image_url: TEXT (URL da imagem)
- link_url: TEXT (link de redirecionamento)
- position: TEXT (homepage, sidebar, footer)
- is_active: BOOLEAN (ativo/inativo)
- display_order: INTEGER (ordem de exibição)
- start_date: TIMESTAMPTZ (data de início)
- end_date: TIMESTAMPTZ (data de fim)
- click_count: INTEGER (contador de cliques)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
- created_by: UUID (ID do admin que criou)
```

### Componentes

- **`AdvertisementCarousel`**: Componente de carrossel para exibir banners
- **`AdminBannersPage`**: Página de gerenciamento para admins

### Rotas

- `/admin/banners`: Painel de gerenciamento (apenas admins)
- Homepage: Exibe automaticamente os banners ativos

## 🎯 Boas Práticas

1. **Imagens**
   - Use imagens de alta qualidade
   - Otimize o tamanho do arquivo (máx 500KB)
   - Use formato WebP quando possível
   - Mantenha proporção 3:1 (1200x400px)

2. **Textos**
   - Títulos curtos e impactantes
   - Descrições claras e objetivas
   - Use call-to-action nos links

3. **Organização**
   - Use ordem de exibição para priorizar banners
   - Defina datas de início/fim para campanhas temporárias
   - Desative banners antigos em vez de excluí-los (para histórico)

4. **Performance**
   - Não exceda 5 banners ativos simultaneamente
   - Use CDN para hospedar imagens
   - Teste o carregamento em diferentes dispositivos

## 🚀 Próximas Melhorias

- [ ] Upload direto de imagens (sem precisar de URL externa)
- [ ] Editor de texto rico para descrições
- [ ] Templates pré-definidos
- [ ] A/B testing de banners
- [ ] Relatórios detalhados de cliques
- [ ] Agendamento automático de banners
- [ ] Banners por dispositivo (mobile/desktop)
- [ ] Integração com Google Analytics

## 📝 Notas Importantes

- Banners inativos não são exibidos
- Banners com data de fim passada são automaticamente ocultados
- Banners com data de início futura só aparecem após a data
- O carrossel só aparece se houver pelo menos 1 banner ativo
- Se não houver banners, mostra o placeholder padrão "Seu anúncio aqui"

