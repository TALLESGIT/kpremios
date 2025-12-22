# 🎯 ZK Oficial - Sistema de Rifas e Sorteios

Sistema completo de rifas e sorteios online com integração WhatsApp e sorteios ao vivo.

## 🚀 Início Rápido com Docker

### Pré-requisitos
- Docker instalado
- Docker Compose instalado

### Executar com Docker (Recomendado)

```bash
# Windows (PowerShell)
.\docker-start.ps1

# Linux/Mac
./docker-start.sh

# Ou manualmente
docker-compose up --build
```

A aplicação estará disponível em:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001

## 🌍 Configuração em Português

A aplicação está totalmente configurada em **Português Brasileiro**:

- ✅ Interface completamente em português
- ✅ Timezone configurado para São Paulo
- ✅ Locale configurado para pt_BR.UTF-8
- ✅ Mensagens e notificações em português

## 📱 Funcionalidades

### Para Usuários
- 🎲 **Sorteios Principais**: Sistema de rifas com números
- 🎮 **Sorteios ao Vivo**: Jogo "Resta Um" em tempo real
- 📱 **Notificações WhatsApp**: Receba atualizações via WhatsApp
- 👤 **Perfil Completo**: Cadastro e gerenciamento de números
- 📹 **Transmissões ao Vivo**: Assista transmissões ao vivo com chat em tempo real

### Para Administradores
- 🎯 **Dashboard Completo**: Controle total dos sorteios
- 🎮 **Sorteios ao Vivo**: Criação e controle de jogos "Resta Um"
- 📱 **WhatsApp Business**: Envio de notificações em massa
- 👥 **Gerenciamento de Usuários**: Aprovação de números extras
- 📹 **Transmissões ao Vivo**: Sistema completo de streaming com:
  - 🎥 Transmissão de vídeo e áudio em tempo real
  - 📊 Dashboard de estatísticas (viewers, tempo médio, propagandas)
  - 🔗 Links personalizados para transmissões
  - 🎬 Sistema de gravação (WebM/MP4)
  - 📢 Sistema de propagandas (slideshow e overlay fullscreen)
  - 💬 Chat em tempo real integrado

## 🛠️ Desenvolvimento Local

### Instalação Tradicional

```bash
# Instalar dependências
npm install
cd backend && npm install

# Configurar variáveis de ambiente
cp env.example .env
# Editar .env com suas credenciais

# Iniciar desenvolvimento
npm run dev
```

### Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Docker
npm run docker:build
npm run docker:up
npm run docker:down
```

## 🔧 Configuração

### Variáveis de Ambiente

Copie `env.example` para `.env` e configure:

```env
# Supabase
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima

# Vonage WhatsApp
VITE_VONAGE_API_KEY=sua_api_key
VITE_VONAGE_API_SECRET=seu_secret
VITE_VONAGE_APPLICATION_ID=seu_app_id
VITE_VONAGE_WHATSAPP_FROM=seu_numero
VITE_VONAGE_REAL_MODE=true
```

## 📚 Documentação Adicional

- [🐳 Docker Setup](./DOCKER_SETUP.md) - Configuração detalhada do Docker
- [📱 WhatsApp Setup](./COMO_CONFIGURAR_VERCEL.md) - Configuração do WhatsApp
- [🔑 Credenciais Vonage](./COMO_OBTER_CREDENCIAIS_VONAGE.md) - Como obter credenciais
- [📹 Transmissões ao Vivo](./COMO_FUNCIONA_LIVE_COMPLETO.md) - Guia completo de transmissões
- [📋 Changelog 20/01/2025](./CHANGELOG_2025_01_20.md) - Todas as atualizações de hoje

## 🎮 Sorteios ao Vivo - "Resta Um"

Sistema de sorteio em tempo real onde:
1. Admin cria um sorteio com limite de participantes
2. Usuários escolhem um número cada
3. Sistema elimina participantes automaticamente
4. Último participante ganha!

## 🛡️ Segurança

- Autenticação via Supabase
- Row Level Security (RLS)
- Validação de dados no frontend e backend
- Proteção contra SQL injection

## 📞 Suporte

Para dúvidas ou problemas, consulte a documentação específica ou entre em contato.

---

**🇧🇷 Desenvolvido com ❤️ para o Brasil**
