# 📋 Guia de Configuração: Notificações Push (FCM)

Para que as notificações do K-Premios funcionem corretamente, você precisa configurar as credenciais do Firebase dentro do painel do Supabase.

### 1. Obter o JSON da Service Account do Firebase
1. Vá para o [Console do Firebase](https://console.firebase.google.com/).
2. Abra o seu projeto.
3. Clique na **Engrenagem (Configurações do Projeto)** -> **Contas de Serviço**.
4. Clique em **Gerar nova chave privada**.
5. Um arquivo `.json` será baixado. Abra ele e **copie todo o conteúdo**.

### 2. Adicionar o Segredo (Secret) no Supabase
1. Vá para o [Dashboard do Supabase](https://supabase.com/dashboard). Selecione seu projeto (`bukigyhhgrtgryklabjg`).
3. Vá em **Edge Functions** (no menu lateral).
4. Clique no botão **Add Secret** (ou vá em Settings -> API -> Secrets).
5. Adicione um novo segredo:
   - **Name**: `FIREBASE_SERVICE_ACCOUNT`
   - **Value**: Estique o conteúdo do arquivo `.json` que você copiou (cole o texto todo).
6. Clique em **Save**.

### 3. Fazer Deploy da Edge Function (Obrigatório)
Como alterei o código da função, você precisa atualizar no Supabase:
1. No terminal do seu computador (na pasta do projeto), rode:
   ```bash
   supabase functions deploy notify-live-start
   ```

### 4. Atualizar o Trigger do Banco de Dados
1. No Dashboard do Supabase, vá em **SQL Editor**.
2. Abra o arquivo `fix_notification_trigger.sql` que eu criei na raiz do projeto.
3. Copie o conteúdo e cole no SQL Editor.
4. **IMPORTANTE**: No código SQL, substitua `'SUA_SERVICE_ROLE_KEY_AQUI'` pela sua chave real (você a encontra em *Settings -> API -> service_role*).
5. Clique em **Run**.

### 5. Testar no App
1. Abra o app no seu celular (Android).
2. Vá em **Perfil** -> **Testar Recebimento**.
3. Se tudo estiver certo, você verá uma mensagem "Requisição enviada" e deverá receber uma notificação de teste em alguns segundos.

---
> [!IMPORTANT]
> Se você já tiver o app instalado, **feche-o totalmente e abra de novo** para que ele registre o novo "Canal de Notificação" que eu configurei.
