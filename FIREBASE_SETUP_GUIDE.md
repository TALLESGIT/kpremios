# Passo a Passo: Configurando o Firebase para Notificações Push

Para as notificações funcionarem no Android, precisamos vincular o app ao Firebase. Siga estes passos simples:

### 1. Criar o Projeto no Firebase
1. Acesse o [Console do Firebase](https://console.firebase.google.com/).
2. Clique em **"Adicionar projeto"**.
3. Dê um nome ao projeto (ex: `ZK Premios`) e continue.
4. Pode desativar o Google Analytics por enquanto (ou deixar ativado se preferir).
5. Clique em **"Criar projeto"**.

### 2. Adicionar o App Android
1. No painel do projeto, clique no ícone do **Android (robô)**.
2. No campo **"Nome do pacote Android"**, coloque EXATAMENTE:
   > `com.zkoficial.premios`
3. O apelido e a chave SHA-1 são opcionais por enquanto (pode deixar em branco).
4. Clique em **"Registrar app"**.

### 3. Baixar o Arquivo de Configuração
1. O Firebase vai gerar o arquivo `google-services.json`.
2. Clique no botão azul **"Fazer download de google-services.json"**.
3. **Pode me passar o conteúdo desse arquivo por aqui mesmo!** Eu vou colocar ele no lugar certo do seu código.

### 4. Ativar o Cloud Messaging (FCM)
1. No console do Firebase, clique na engrenagem ⚙️ (Configurações do projeto) no menu lateral.
2. Vá na aba **"Cloud Messaging"**.
3. Verifique se a **"API do Firebase Cloud Messaging (V1)"** está ativada.

---

### 🔑 Parte 5: Configurando o Supabase (O "Cérebro" do Envio)

Agora que você tem o arquivo JSON da **Conta de Serviço**, precisamos colocar ele no Supabase para ele ter permissão de enviar as notificações.

1. **Adicionar a Chave Privada:**
   - No painel do Supabase, vá em **Edge Functions**.
   - Procure por uma opção de **Secrets** ou rode este comando no seu terminal:
     > `supabase secrets set FIREBASE_SERVICE_ACCOUNT='COLE_AQUI_O_CONTEUDO_DO_JSON'`
   - *(Dica: Certifique-se de que o texto do JSON esteja em uma única linha ou use aspas simples envolta de tudo)*.

2. **Implantar a Função:**
   - No seu terminal, dentro da pasta do projeto, rode:
     > `supabase functions deploy notify-live-start`

3. **Ativar o Gatilho Automático:**
   - Use o arquivo SQL que criei para você: [20260223_live_notification_trigger.sql](file:///c:/Users/Talle/Desktop/talles/kpremios-master/supabase/migrations/20260223_live_notification_trigger.sql)
   - Copie o conteúdo dele e rode no **SQL Editor** do seu Supabase.

---

### ✅ Como Testar:
1. Abra o app no seu celular (após fazer o build novo).
2. Aceite a permissão de notificações.
3. No painel de Admin, inicie uma **Live**.
4. Você deve receber a notificação: *"🔴 ESTAMOS AO VIVO!"* no seu celular!
