# 🧪 Guia de Testes - ZK Viewer v1 Otimizado

## 📋 Checklist de Testes

### ✅ Fase 1: Testes Básicos (30min)

#### 1.1 Conexão e Reprodução
- [ ] **Desktop Chrome**: Abre e reproduz stream
- [ ] **Desktop Firefox**: Abre e reproduz stream
- [ ] **Desktop Edge**: Abre e reproduz stream
- [ ] **Desktop Safari** (Mac): Abre e reproduz stream

#### 1.2 Mobile
- [ ] **Android Chrome**: Reproduz corretamente
- [ ] **Android Chrome Landscape**: Auto fullscreen funciona
- [ ] **iOS Safari**: Reproduz corretamente
- [ ] **iOS Safari Landscape**: Auto fullscreen funciona

#### 1.3 Funcionalidades Básicas
- [ ] Vídeo aparece sem cortes
- [ ] Áudio sincronizado com vídeo
- [ ] Fullscreen funciona (duplo clique)
- [ ] Sair de fullscreen funciona (ESC)
- [ ] Chat abre/fecha corretamente

---

### ⚡ Fase 2: Testes de Performance (1h)

#### 2.1 Métricas de CPU/RAM

**Como medir**:
1. Abrir DevTools (F12)
2. Ir em "Performance" ou "Memory"
3. Iniciar gravação
4. Reproduzir stream por 5 minutos
5. Parar gravação e analisar

**Metas**:
- [ ] CPU < 20% em média (desktop)
- [ ] CPU < 50% em média (mobile)
- [ ] RAM < 150MB
- [ ] Sem memory leaks (RAM estável)

#### 2.2 Latência

**Como medir**:
1. Iniciar transmissão no ZK Studio Pro
2. Fazer uma ação visível (ex: acenar)
3. Cronometrar até aparecer no site

**Metas**:
- [ ] Latência < 100ms (ideal)
- [ ] Latência < 500ms (aceitável)
- [ ] Latência consistente (não varia muito)

#### 2.3 Time to First Frame

**Como medir**:
1. Abrir DevTools Network
2. Recarregar página
3. Medir tempo até primeiro frame aparecer

**Metas**:
- [ ] < 1s em WiFi
- [ ] < 2s em 4G
- [ ] < 3s em 3G

---

### 🔄 Fase 3: Testes de Estabilidade (2h)

#### 3.1 Conexão Instável
- [ ] **WiFi fraco**: Stream se recupera automaticamente
- [ ] **4G/3G**: Funciona sem travar
- [ ] **Perda de conexão**: Mostra mensagem e reconecta

#### 3.2 Longa Duração
- [ ] **30 minutos**: Sem travamentos
- [ ] **1 hora**: Sem memory leaks
- [ ] **2 horas**: Performance estável

#### 3.3 Múltiplas Abas
- [ ] Abrir 3 abas simultâneas
- [ ] Todas reproduzem corretamente
- [ ] CPU/RAM não explodem

---

### 📱 Fase 4: Testes Mobile Específicos (1h)

#### 4.1 Orientação
- [ ] **Retrato → Paisagem**: Auto fullscreen
- [ ] **Paisagem → Retrato**: Sai de fullscreen
- [ ] **Rotação rápida**: Não trava

#### 4.2 Gestures
- [ ] **Duplo toque**: Fullscreen
- [ ] **Pinch-to-zoom**: Não interfere
- [ ] **Swipe**: Não fecha acidentalmente

#### 4.3 Background/Foreground
- [ ] Minimizar app: Stream pausa
- [ ] Voltar ao app: Stream retoma
- [ ] Notificação: Não interrompe

---

### 🎯 Fase 5: Testes de UX (30min)

#### 5.1 Estados Visuais
- [ ] **Conectando**: Spinner aparece
- [ ] **Aguardando stream**: Mensagem clara
- [ ] **Autoplay bloqueado**: Botão "Clique para iniciar"
- [ ] **Erro**: Mensagem descritiva

#### 5.2 Controles
- [ ] Botão chat transparente (não atrapalha)
- [ ] Botão fullscreen visível
- [ ] Controles auto-hide (3s)
- [ ] Hover mostra controles

#### 5.3 Responsividade
- [ ] Desktop 1920x1080: Perfeito
- [ ] Desktop 1366x768: Perfeito
- [ ] Tablet 768x1024: Perfeito
- [ ] Mobile 375x667: Perfeito

---

## 📊 Comparação Antes vs Depois

### Métricas a Coletar

| Métrica | Antes | Depois | Meta |
|---------|-------|--------|------|
| CPU (%) | ? | ? | < 20% |
| RAM (MB) | ? | ? | < 150MB |
| Latência (ms) | ? | ? | < 100ms |
| Time to Frame (s) | ? | ? | < 1s |
| FPS | ? | ? | 30fps |

### Como Preencher

1. **Antes**: Usar backup `ZKViewer.backup.tsx`
2. **Depois**: Usar novo `ZKViewer.tsx`
3. **Comparar**: Calcular % de melhoria

---

## 🔍 Ferramentas de Teste

### Chrome DevTools
```
F12 → Performance → Record
- CPU Usage
- Memory Usage
- FPS
- Network
```

### Firefox DevTools
```
F12 → Performance → Start Recording
- Similar ao Chrome
```

### Mobile Remote Debugging

**Android**:
```
chrome://inspect
- Conectar device via USB
- Inspecionar página
```

**iOS**:
```
Safari → Develop → [Device]
- Conectar device via USB
- Inspecionar página
```

---

## 🐛 Problemas Conhecidos a Verificar

### ✅ Resolvidos (devem funcionar)
- [x] Delay absurdo de áudio/vídeo
- [x] Corte de conteúdo em fullscreen mobile
- [x] Chat não abre em fullscreen
- [x] Auto fullscreen em landscape

### ⚠️ A Verificar
- [ ] Picture-in-Picture funciona?
- [ ] Funciona em navegadores antigos?
- [ ] Funciona com VPN?
- [ ] Funciona em rede corporativa?

---

## 📝 Template de Relatório

```markdown
## Teste: [Nome do Teste]
**Data**: [DD/MM/YYYY]
**Testador**: [Nome]
**Device**: [Desktop/Mobile]
**Browser**: [Chrome/Firefox/Safari]
**Conexão**: [WiFi/4G/3G]

### Resultados
- CPU: X%
- RAM: XMB
- Latência: Xms
- Time to Frame: Xs
- FPS: X

### Observações
- [Problema encontrado]
- [Comportamento inesperado]
- [Sugestão de melhoria]

### Status
✅ Passou | ⚠️ Passou com ressalvas | ❌ Falhou
```

---

## 🎯 Critérios de Aceitação

### ✅ Aprovado se:
- CPU < 20% (desktop) ou < 50% (mobile)
- RAM < 150MB
- Latência < 100ms
- Time to Frame < 1s
- Sem travamentos em 30min
- Funciona em 90% dos devices testados

### ❌ Reprovado se:
- CPU > 60%
- RAM > 250MB
- Latência > 1000ms
- Travamentos frequentes
- Não funciona em devices principais

---

## 🚀 Próximos Passos Após Testes

### Se APROVADO ✅
1. Deploy em produção
2. Monitorar métricas reais
3. Coletar feedback de usuários
4. Iterar melhorias

### Se REPROVADO ❌
1. Analisar logs de erro
2. Identificar gargalos
3. Aplicar correções
4. Re-testar

---

## 💡 Dicas de Teste

### Performance
- Testar em device médio (não high-end)
- Simular conexão lenta (DevTools → Network → Slow 3G)
- Monitorar por tempo prolongado

### UX
- Testar com usuário real (não técnico)
- Observar comportamento natural
- Anotar confusões/dificuldades

### Estabilidade
- Deixar rodando overnight
- Testar em horários de pico
- Simular cenários extremos

---

**Objetivo**: Garantir que o ZK Viewer v1 Otimizado entrega a melhor experiência possível de streaming profissional! 🎥✨

