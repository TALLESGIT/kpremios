# 🔄 Atualização do Agora.io App ID

## ✅ App ID Atualizado

**Novo App ID**: `faf00b0f009a4ff7b48e62fadaf8fefd`

---

## 📝 O que foi feito

### 1. ✅ Atualizado no `.env` local
```bash
VITE_AGORA_APP_ID=faf00b0f009a4ff7b48e62fadaf8fefd
```

---

## 🚀 Próximos Passos: Atualizar na Vercel

### Opção 1: Via Dashboard da Vercel (Recomendado)

1. ✅ Acessar: https://vercel.com/tallesgit/zkpremios
2. ✅ Ir em **Settings** → **Environment Variables**
3. ✅ Procurar por `VITE_AGORA_APP_ID`
4. ✅ Clicar em **Edit** (ícone de lápis)
5. ✅ Alterar o valor para: `faf00b0f009a4ff7b48e62fadaf8fefd`
6. ✅ Clicar em **Save**
7. ✅ Ir em **Deployments** → Clicar nos 3 pontinhos do último deploy → **Redeploy**

### Opção 2: Via CLI da Vercel

```bash
# Instalar Vercel CLI (se não tiver)
npm install -g vercel

# Login
vercel login

# Atualizar variável
vercel env rm VITE_AGORA_APP_ID production
vercel env add VITE_AGORA_APP_ID production
# Quando perguntar o valor, colar: faf00b0f009a4ff7b48e62fadaf8fefd

# Fazer redeploy
vercel --prod
```

---

## 🧪 Como Testar Após Deploy

1. ✅ Abrir: https://www.zkoficial.com.br/admin/live
2. ✅ Iniciar uma live
3. ✅ Abrir DevTools (F12) → Console
4. ✅ Procurar por logs do Agora.io:
   ```
   Agora-SDK [INFO]: join channel success
   ```
5. ✅ Verificar que o vídeo está transmitindo corretamente

---

## ⚠️ Importante

- O **App ID antigo** (`b7c17dffce914824aef621653d28f63f`) **não funcionará mais**
- Certifique-se de atualizar **tanto no `.env` local quanto na Vercel**
- O **ZK Studio** (desktop app) também precisa usar o **mesmo App ID**

---

## 📊 Verificação

### Local (desenvolvimento):
```bash
# Verificar .env
Get-Content .env | Select-String "VITE_AGORA_APP_ID"
# Deve mostrar: VITE_AGORA_APP_ID=faf00b0f009a4ff7b48e62fadaf8fefd
```

### Vercel (produção):
```bash
# Verificar variável na Vercel
vercel env ls
# Deve listar VITE_AGORA_APP_ID com o novo valor
```

---

## 🔧 Troubleshooting

### Erro: "Invalid App ID"
- ✅ Confirmar que o App ID está correto na Vercel
- ✅ Fazer redeploy após alterar a variável
- ✅ Limpar cache do navegador (Ctrl+Shift+Delete)

### Erro: "Failed to join channel"
- ✅ Verificar se o App ID no ZK Studio é o mesmo
- ✅ Verificar se o canal Agora está ativo
- ✅ Verificar logs do Agora.io no console

---

**Data**: 2026-01-22  
**Status**: ✅ Atualizado localmente, aguardando atualização na Vercel  
**Próximo Passo**: Atualizar variável `VITE_AGORA_APP_ID` na Vercel e fazer redeploy
