# Caderno de Pontos — guia de instalação

Três partes: **Supabase** (banco + login), **config.js** (conectar o site ao banco) e **Vercel** (colocar no ar).

## 1. Criar o projeto no Supabase

1. Acesse https://supabase.com, crie uma conta e clique em **New project**.
2. Escolha um nome, uma senha de banco (guarde-a) e a região mais próxima. Aguarde a criação (leva ~1 min).
3. No menu lateral, vá em **SQL Editor** → **New query**.
4. Cole todo o conteúdo do arquivo `schema.sql` (incluído aqui) e clique em **Run**. Isso cria as tabelas `profiles`, `foods` e `entries`, além das regras de segurança (RLS).
5. Vá em **Authentication → Providers** e confirme que **Email** está habilitado (vem habilitado por padrão).
   - Opcional, mas recomendado enquanto testa: em **Authentication → Settings**, desmarque "Confirm email" para não precisar confirmar cadastro por e-mail a cada teste. Você pode reativar depois, para produção.

## 2. Pegar suas credenciais

Em **Project Settings → API**, copie:
- **Project URL**
- **anon public key**

Abra o arquivo `config.js` e substitua:

```js
window.SUPABASE_URL = "https://SEU-PROJETO.supabase.co";
window.SUPABASE_ANON_KEY = "SUA-CHAVE-ANON-AQUI";
```

## 3. Testar localmente (opcional)

Como é um site estático, basta abrir `index.html` num navegador, ou rodar um servidor simples:

```bash
npx serve .
```

## 4. Virar admin

1. No site, crie sua conta normalmente (aba "Criar conta").
2. Volte ao **SQL Editor** do Supabase e rode (trocando pelo seu e-mail):

```sql
update public.profiles set role = 'admin' where email = 'seu-email@exemplo.com';
```

3. Saia e entre de novo no site — agora você verá os controles de admin na aba "Alimentos" (adicionar/editar/excluir itens da lista).

## 5. Publicar na Vercel

Opção mais simples (sem linha de comando):
1. Crie um repositório no GitHub e suba os 3 arquivos (`index.html`, `config.js` já preenchido, e opcionalmente o `schema.sql`).
2. Em https://vercel.com, clique em **Add New → Project**, importe esse repositório.
3. Como é um site estático puro, não precisa configurar build command nem output directory — pode deixar em branco ou escolher "Other". Clique em **Deploy**.

Ou via linha de comando, dentro da pasta do projeto:

```bash
npm i -g vercel
vercel
```

Depois de publicado, qualquer pessoa com o link pode criar a própria conta (e-mail/senha) e começar a trackear os pontos; só quem você tornar admin (passo 4) consegue editar a lista de alimentos.

## 6. Painel de administração de contas (aba "Usuários")

Essa aba só aparece pra quem é admin, e permite: ver todas as contas, confirmar e-mail manualmente, definir uma nova senha para qualquer usuário, promover/rebaixar admin, e excluir contas.

Por trás dos panos, isso usa uma função da própria Vercel (pasta `api/`) que guarda a **chave de serviço** do Supabase (bem mais poderosa que a chave "anon" usada no site) — por isso ela **nunca** vai no `config.js` nem em nenhum arquivo que sobe pro navegador do usuário.

Pra funcionar, configure 3 variáveis de ambiente no seu projeto da Vercel:

1. No Supabase: **Project Settings → API**, copie de novo a **Project URL** e a **anon public key**, e agora também a **service_role key** (tem um botão "Reveal" — trate ela como uma senha de administrador do banco inteiro).
2. Na Vercel: abra o projeto → **Settings → Environment Variables** e adicione:

| Nome | Valor |
|---|---|
| `SUPABASE_URL` | a mesma Project URL |
| `SUPABASE_ANON_KEY` | a mesma anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | a service_role key (⚠️ nunca compartilhe ou suba pro GitHub) |

3. Depois de salvar as variáveis, vá em **Deployments** e clique em **Redeploy** no último deployment (variáveis de ambiente só valem a partir do próximo deploy).

Como esses arquivos usam um pacote (`@supabase/supabase-js`) do lado do servidor, incluí um `package.json` na raiz — a Vercel instala isso sozinha durante o deploy, você não precisa rodar `npm install` manualmente (a menos que queira testar localmente com `vercel dev`).

**Importante**: essas funções administrativas só funcionam quando o site está de fato publicado na Vercel (elas rodam como servidor). Abrir o `index.html` direto no navegador, ou com `npx serve .`, não vai executá-las — só o resto do app (login, registrar alimentos, etc.) continua funcionando normalmente nesses casos.


- **profiles**: um registro por usuário, com a meta diária de pontos (`daily_goal`) e o papel (`role`: `user` ou `admin`).
- **foods**: lista compartilhada de alimentos com pontos; todo usuário logado pode ler, só admin pode escrever (garantido por regra de segurança no banco, não só na tela).
- **entries**: cada alimento que um usuário adiciona no dia, com a data (`entry_date`) — é isso que dá o histórico diário.
