# 📋 Changelog - 20 de Janeiro de 2025

## 🎉 Atualizações do Sistema de Transmissão ao Vivo

### ✨ Novas Funcionalidades

#### 1. 📊 Sistema de Estatísticas em Tempo Real
- **Dashboard de Estatísticas para Admin**
  - Contador de viewers em tempo real (atualiza a cada 2 segundos)
  - Tempo médio de visualização
  - Total de tempo assistido
  - Sessões únicas
  - Top 5 propagandas mais vistas
  - Qualidade da conexão
  - Status da conexão (Conectado/Desconectando/etc)

- **Tracking de Sessões de Viewers**
  - Cada viewer recebe um ID único de sessão
  - Duração da sessão é atualizada a cada 5 segundos
  - Sessão é finalizada automaticamente quando o viewer sai

- **Tracking de Visualizações de Propagandas**
  - Registro de cada visualização de propaganda (slideshow e overlay)
  - Duração de visualização
  - Estatísticas agregadas por propaganda

#### 2. 🔗 Links Personalizados para Transmissões
- **Geração Automática de Slug**
  - Link gerado automaticamente a partir do título
  - Exemplo: "Cruzeiro x Corintians" → `/live/cruzeiro-x-corintians`
  - Sanitização automática (remove acentos, caracteres especiais)
  - Conversão para minúsculas e substituição de espaços por hífens

- **Edição de Nome do Link**
  - Opção de editar o nome do link antes de iniciar a transmissão
  - Validação de unicidade (não permite nomes duplicados)
  - Preview do link em tempo real

- **Campo Opcional no Formulário**
  - Campo "Nome do Link" no formulário de criação
  - Checkbox para ativar/desativar geração automática
  - Se deixar em branco, gera automaticamente

#### 3. 🎥 Sistema de Gravação
- **Gravação de Transmissões**
  - Botão "Iniciar Gravação" / "Parar Gravação"
  - Gravação em formato WebM (compatível com MP4)
  - Captura simultânea de vídeo e áudio
  - Download automático ao parar a gravação
  - Contador de tempo de gravação em tempo real (MM:SS)
  - Indicador visual durante a gravação

- **Formato do Arquivo**
  - Nome: `live-recording-{canal}-{timestamp}.webm`
  - Codec: VP9/VP8 (vídeo) + Opus (áudio)
  - Qualidade: 2.5 Mbps

#### 4. 🔒 Restrição de Transmissão Única
- **Apenas Uma Transmissão Ativa**
  - Sistema verifica se já existe transmissão ativa antes de iniciar
  - Bloqueio automático se outra transmissão estiver ativa
  - Mensagem clara informando qual transmissão está ativa
  - Aplicado em todos os botões de iniciar/reiniciar

### 🐛 Correções de Bugs

#### 1. Estatísticas em Tempo Real
- ✅ Corrigido erro de ambiguidade SQL (`column reference "ad_id" is ambiguous`)
- ✅ Funções SQL corrigidas com qualificação de colunas
- ✅ Atualização de estatísticas reduzida de 10s para 2s
- ✅ Atualização de duração de sessão reduzida de 30s para 5s
- ✅ Contador de viewers agora usa sessões ativas reais

#### 2. Sincronização de Slideshow
- ✅ Corrigido problema de slideshow ficando preso em uma imagem para viewers
- ✅ Sincronização explícita via localStorage
- ✅ Atualização de índice de slide a cada 300ms

#### 3. Propaganda Overlay
- ✅ Corrigido problema de PiP não aparecer para viewers
- ✅ Áudio do admin funciona durante overlay
- ✅ Sincronização de estado via localStorage

#### 4. Erros de Renderização
- ✅ Corrigido erro "Cannot read properties of null (reading 'avgWatchTime')"
- ✅ Adicionadas verificações de null/undefined
- ✅ Indicadores de carregamento enquanto dados são buscados

### 🔧 Melhorias Técnicas

#### 1. Performance
- ✅ Atualização de estatísticas otimizada (2 segundos)
- ✅ Queries SQL otimizadas com índices
- ✅ Redução de re-renders desnecessários

#### 2. Experiência do Usuário
- ✅ Mensagens de erro mais claras e específicas
- ✅ Indicadores visuais de carregamento
- ✅ Feedback imediato em todas as ações
- ✅ Validação em tempo real de nomes de canal

#### 3. Código
- ✅ Funções SQL refatoradas para evitar ambiguidades
- ✅ Tratamento de erros melhorado
- ✅ Logs de depuração adicionados
- ✅ Código mais limpo e organizado

### 📁 Arquivos Modificados

#### Backend (Supabase)
- `supabase/migrations/20250120_create_viewer_tracking.sql` - Tabelas de tracking
- Funções SQL: `get_stream_statistics`, `get_ad_statistics`
- Correção de ambiguidade em funções SQL

#### Frontend
- `src/pages/AdminLiveStreamPage.tsx`
  - Dashboard de estatísticas
  - Sistema de links personalizados
  - Botão de gravação
  - Verificação de transmissão única
  
- `src/pages/PublicLiveStreamPage.tsx`
  - Tracking de sessão de viewers
  - Atualização de duração a cada 5 segundos

- `src/components/live/VideoStream.tsx`
  - Sistema de gravação
  - Callbacks para estatísticas
  - Melhorias na sincronização

### 📊 Estrutura de Dados

#### Tabelas Criadas
1. **viewer_sessions**
   - Rastreia sessões de visualização
   - Campos: session_id, stream_id, started_at, ended_at, duration_seconds, is_active

2. **ad_views**
   - Rastreia visualizações de propagandas
   - Campos: ad_id, ad_type, viewed_at, duration_seconds

#### Funções SQL
1. **get_stream_statistics(p_stream_id)**
   - Retorna: total_viewers, active_viewers, avg_watch_time, total_watch_time, unique_sessions

2. **get_ad_statistics(p_stream_id)**
   - Retorna: ad_id, ad_type, total_views, total_duration, avg_duration

### 🎯 Como Usar as Novas Funcionalidades

#### Links Personalizados
1. Ao criar transmissão, digite o título (ex: "Cruzeiro x Corintians")
2. O link será gerado automaticamente: `/live/cruzeiro-x-corintians`
3. Ou edite manualmente desmarcando "Gerar automaticamente do título"

#### Gravação
1. Inicie a transmissão
2. Aguarde alguns segundos para a transmissão estabilizar
3. Clique em "Iniciar Gravação"
4. Quando quiser parar, clique em "Parar Gravação"
5. O arquivo será baixado automaticamente

#### Estatísticas
1. Acesse a página de transmissão como admin
2. As estatísticas são atualizadas automaticamente a cada 2 segundos
3. Veja viewers, tempo médio, propagandas mais vistas, etc.

### ⚠️ Notas Importantes

- **Gravação**: Formato WebM pode ser convertido para MP4 usando ferramentas online ou VLC
- **Transmissão Única**: Apenas um admin pode transmitir por vez
- **Estatísticas**: Requer que viewers estejam assistindo para aparecerem dados
- **Links**: Nomes de canal devem ser únicos no sistema

### 🔮 Próximas Melhorias Sugeridas

- [ ] Conversão automática de WebM para MP4
- [ ] Histórico de gravações salvas no servidor
- [ ] Exportação de relatórios em PDF/Excel
- [ ] Notificações quando viewer entra/sai
- [ ] Gráficos de visualização ao longo do tempo

---

**Data**: 20 de Janeiro de 2025  
**Versão**: 2.0.0  
**Desenvolvedor**: Sistema de Transmissão ao Vivo

