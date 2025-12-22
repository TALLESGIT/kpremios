# 🎯 Limites VIP por Live - Sistema de Controle

## 📋 Regras Implementadas

### **1. Limite de Áudios VIP**
- ✅ **Máximo 3 áudios por usuário VIP por live**
- ✅ Contador individual por usuário
- ✅ Resetado quando nova live inicia
- ✅ Aviso: "Restam X áudios nesta live"

### **2. Limite de Mensagens VIP na Tela**
- ✅ **Máximo 10 mensagens VIP na tela por live** (total, não por usuário)
- ✅ Contador global por live
- ✅ Resetado quando nova live inicia
- ✅ Aviso: "Restam X mensagens VIP na tela"

### **3. Limpeza ao Encerrar Live**
- ✅ **Ao encerrar a live, TODAS as mensagens e áudios são excluídos do banco**
- ✅ Limpeza automática quando `is_active = false`
- ✅ Chat fica limpo para próxima live

---

## 🔄 Como Funciona

### **Contagem de Áudios:**
1. Usuário VIP tenta enviar áudio
2. Sistema conta quantos áudios ele já enviou nesta live
3. Se < 3 → Permite enviar
4. Se >= 3 → Bloqueia e avisa: "Você já enviou 3 áudios nesta live"
5. Mostra: "Restam X áudios" (3 - enviados)

### **Contagem de Mensagens na Tela:**
1. Mensagem VIP é enviada
2. Sistema conta quantas mensagens VIP já apareceram na tela nesta live
3. Se < 10 → Mostra na tela
4. Se >= 10 → Não mostra na tela (mas salva no chat)
5. Mostra: "Restam X mensagens VIP na tela" (10 - exibidas)

### **Limpeza ao Encerrar:**
1. Admin clica "Encerrar Live"
2. Sistema define `is_active = false`
3. **Automaticamente exclui todas as mensagens do chat desta live**
4. Banco fica limpo para próxima live

---

## 🛠️ Implementação Técnica

### **1. Função RPC: Contar Áudios do Usuário**
```sql
CREATE FUNCTION count_user_audio_messages(p_user_id UUID, p_stream_id UUID)
RETURNS INTEGER
-- Conta mensagens tipo 'tts' do usuário nesta live
```

### **2. Função RPC: Contar Mensagens VIP na Tela**
```sql
CREATE FUNCTION count_vip_overlay_messages(p_stream_id UUID)
RETURNS INTEGER
-- Conta mensagens VIP que apareceram na tela nesta live
```

### **3. Atualização no LiveChat:**
- Verificar limite antes de enviar áudio
- Mostrar contador: "Restam X áudios"
- Bloquear se atingiu limite

### **4. Atualização no VipMessageOverlay:**
- Contar mensagens exibidas
- Parar de exibir após 10 mensagens
- Mostrar aviso se necessário

### **5. Atualização no stopStream:**
- Deletar todas as mensagens do chat ao encerrar
- Limpar banco de dados

---

## 📊 Interface do Usuário

### **Contador de Áudios:**
```
[Botão Microfone] Restam 2 áudios nesta live
```

### **Contador de Mensagens na Tela:**
```
💎 Mensagens VIP na tela: 7/10 restantes
```

### **Avisos:**
- "Você já enviou 3 áudios nesta live. Limite atingido."
- "Limite de mensagens VIP na tela atingido (10/10)"

---

## ⚠️ Importante

- **Limites são por live**: Resetam quando nova live inicia
- **Áudios**: Por usuário (cada VIP tem seus 3 áudios)
- **Mensagens na tela**: Global (10 no total para todos os VIPs)
- **Limpeza**: Automática ao encerrar live

---

## 🚀 Benefícios

1. **Controle de spam**: Evita muitos áudios/mensagens
2. **Experiência melhor**: Todos os VIPs têm chance de aparecer
3. **Banco limpo**: Chat sempre organizado
4. **Transparência**: Usuários sabem quantos recursos restam

