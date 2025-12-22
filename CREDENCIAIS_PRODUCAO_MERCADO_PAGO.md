# ✅ Credenciais de Produção - Mercado Pago

## 🎯 Status: PRODUÇÃO

⚠️ **ATENÇÃO:** Estas são credenciais de **PRODUÇÃO**!
- ✅ Receberá pagamentos **REAIS**
- ✅ Não são de teste
- ✅ Configure com cuidado

---

## 🔑 Credenciais de Produção

### **Public Key** (Frontend - Pode ser pública):
```
APP_USR-3e112239-954a-47f7-8d90-da12cb8dccd8
```

### **Access Token** (Backend - CONFIDENCIAL):
```
APP_USR-3077926078115104-122218-6d18b1a798860969f263f9cf0e766895-2672588876
```

### **Client ID:**
```
3077926078115104
```

### **Client Secret** (CONFIDENCIAL):
```
1qYoid5wLTLVcc13DZl1eGIdCSWyCCaF
```

### **Webhook Secret:**
```
48c468b3203394e9f372afbe7a5a4af8b92c1ae8dd81d1eea49e0606ad7de405
```

---

## ⚙️ Configuração no Supabase

### **Secrets que você JÁ configurou:**
- ✅ `MERCADO_PAGO_WEBHOOK_SECRET`

### **Secrets que ainda FALTAM:**

1. **MERCADO_PAGO_ACCESS_TOKEN**
   ```
   APP_USR-3077926078115104-122218-6d18b1a798860969f263f9cf0e766895-2672588876
   ```

2. **VIP_MONTHLY_PRICE** ou **PREÇO_VIP_MENSAL**
   ```
   10.00
   ```
   ⚠️ Valor mensal do VIP: **R$ 10,00**

3. **VITE_APP_URL**
   ```
   https://seu-dominio.com
   ```
   ⚠️ Substitua pela URL real do seu site!

4. **SUPABASE_SERVICE_ROLE_KEY**
   - Pegue em: Settings → API → service_role key

---

## 🔄 Diferença: Teste vs Produção

### **Modo Teste (Sandbox):**
- ❌ Pagamentos não são reais
- ❌ Usado apenas para desenvolvimento
- ❌ Não gera receita

### **Modo Produção (Atual):**
- ✅ Pagamentos são **REAIS**
- ✅ Usuários pagam de verdade
- ✅ Você recebe dinheiro real
- ✅ Configure com cuidado!

---

## ⚠️ Importante

1. **Credenciais de Produção** = Pagamentos reais
2. **Teste primeiro** com valores baixos
3. **Monitore** os pagamentos no Mercado Pago
4. **Webhook** deve estar configurado corretamente
5. **Secrets** devem estar todos configurados

---

## ✅ Próximos Passos

1. ✅ Configurar todos os secrets no Supabase
2. ✅ Configurar webhook no Mercado Pago (modo produção)
3. ✅ Testar com um pagamento pequeno primeiro
4. ✅ Verificar se VIP foi ativado
5. ✅ Monitorar pagamentos no Mercado Pago

---

## 🧪 Teste Recomendado

Antes de ir para produção completa:
1. Faça um pagamento de teste pequeno (R$ 1,00)
2. Verifique se o webhook funcionou
3. Verifique se o VIP foi ativado
4. Confirme que tudo está funcionando
5. Depois pode aumentar o valor

---

## 📝 Checklist Final

- [x] Credenciais de produção recebidas
- [x] Webhook secret configurado no Supabase
- [ ] Access Token configurado no Supabase
- [ ] VIP_MONTHLY_PRICE configurado no Supabase
- [ ] VITE_APP_URL configurado no Supabase
- [ ] SUPABASE_SERVICE_ROLE_KEY configurado no Supabase
- [ ] Webhook configurado no Mercado Pago (modo produção)
- [ ] Teste com pagamento pequeno realizado
- [ ] Sistema funcionando corretamente

