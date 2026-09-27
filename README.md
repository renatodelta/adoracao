# Quinta-feira de Adoração — Capela de São José (Formoso)

Aplicação web para escala e agendamento de horários de adoração ao Santíssimo Sacramento.

## 🚀 Publicação no Cloudflare Pages (100% Gratuito)

Este projeto foi preparado para rodar nativamente no **Cloudflare Pages** utilizando **Cloudflare Pages Functions** e **Cloudflare KV** (banco de dados chave-valor global da Cloudflare).

---

### Passo a Passo para Publicar no Cloudflare

#### 1. Criar o Banco de Dados (Cloudflare KV)
1. Acesse o painel da [Cloudflare](https://dash.cloudflare.com).
2. No menu lateral, acesse **Workers & Pages** -> **KV**.
3. Clique em **Create a Namespace**.
4. Defina o nome como `ADORACAO_KV` e clique em **Add**.

---

#### 2. Publicar no Cloudflare Pages
1. Suba este código para o seu repositório no **GitHub** ou **GitLab**.
2. No painel da Cloudflare, acesse **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**.
3. Selecione o repositório `adoracao`.
4. Em **Build settings**:
   - **Framework preset**: `None`
   - **Build command**: (deixe em branco)
   - **Build output directory**: `/` (ou `.`)
5. Clique em **Save and Deploy**.

---

#### 3. Vincular o Banco de Dados KV ao Projeto
1. Após a publicação, vá na aba **Settings** do seu projeto Pages na Cloudflare.
2. Acesse **Functions** -> **KV Namespace Bindings**.
3. Clique em **Add binding**:
   - **Variable name**: `ADORACAO_KV`
   - **KV namespace**: Selecione o `ADORACAO_KV` criado no Passo 1.
4. Clique em **Save**.
5. Faça um novo Deploy ou acesse **Deployments** -> **Retry deployment** para aplicar a conexão.

---

 Pronto! O site estará online no seu domínio do Cloudflare Pages com banco de dados rápido, seguro e sincronizado globalmente para todos os fiéis.
