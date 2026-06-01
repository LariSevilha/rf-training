# RF Training

Sistema web/PWA para gestão de consultoria online de treino, acompanhamento de alunos e organização de registros de execução.

O projeto possui duas áreas principais:

- **Admin:** cadastro e gerenciamento de alunos, documentos, treinos, exercícios, técnicas, vídeos, itens extras e histórico.
- **Aluno:** acesso aos documentos, treinos, histórico de execução e fluxo de instalação do app/PWA.

---

## Visão geral

O RF Training foi organizado para facilitar manutenção, evolução e deploy.  
A estrutura atual separa melhor as responsabilidades do front-end e do back-end, evitando arquivos gigantes e deixando o desenvolvimento mais profissional.

### Principais recursos

- Login com autenticação via JWT.
- Painel administrativo completo.
- Cadastro e edição de alunos.
- Cadastro de documentos por aluno.
- Montagem de treinos manuais.
- Duplicação de exercício.
- Duplicação de treino completo.
- Alerta estilizado para sair da montagem de treino sem salvar.
- Cadastro de vídeos explicativos.
- Cadastro de exercícios e grupos musculares.
- Cadastro de técnicas de treino.
- Cadastro de itens extras por aluno.
- Histórico do aluno agrupado por treino, exercício e série.
- Geração/visualização de registros para o admin.
- Área do aluno com visual responsivo.
- Suporte PWA com service worker e manifest.

---

## Tecnologias usadas

### Front-end

- HTML
- CSS modularizado
- JavaScript modularizado
- PWA com `manifest.webmanifest`
- Service Worker para cache e instalação

### Back-end

- Node.js
- TypeScript
- Fastify
- Prisma ORM
- PostgreSQL
- JWT
- Bcrypt
- Zod

---

## Estrutura do projeto

```txt
rf-training-organizado/
├── web/
│   ├── pages/
│   │   ├── admin.html
│   │   ├── aluno.html
│   │   ├── index.html
│   │   └── politica-privacidade.html
│   │
│   ├── img/
│   │   ├── logo-consultoria.png
│   │   ├── logoapp-192.png
│   │   ├── logoapp-512.png
│   │   └── logoapp-maskable-512.png
│   │
│   ├── manifest.webmanifest
│   ├── service-worker.js
│   │
│   └── assets/
│       ├── css/
│       │   ├── admin-clean.css
│       │   ├── aluno-clean.css
│       │   ├── main.css
│       │   ├── admin/parts/
│       │   ├── base/
│       │   ├── layouts/
│       │   ├── pages/
│       │   └── utilities/
│       │
│       └── js/
│           ├── admin.js
│           ├── aluno.js
│           ├── api.js
│           ├── app.js
│           ├── common.js
│           ├── guard.js
│           ├── router.js
│           ├── state.js
│           ├── ui.js
│           ├── admin/parts/
│           └── aluno/parts/
│
├── server/
│   ├── src/
│   │   ├── server.ts
│   │   └── seed.ts
│   │
│   ├── dist/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations-manual/
│   │
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── scripts/
│   ├── build-admin.mjs
│   └── build-admin-css.mjs
│
├── package.json
├── docker-compose.yml
├── PROJECT_STRUCTURE.md
└── README.md
```

---

## Organização do JavaScript

### Admin

O arquivo principal do admin é:

```txt
web/assets/js/admin.js
```

Ele funciona como entrada principal e carrega os módulos separados em:

```txt
web/assets/js/admin/parts/
```

Arquivos do admin:

```txt
00-bootstrap-elements-state.js
01-admin-core-students.js
02-dashboard-profile.js
03-admin-events-documents.js
04-workout-builder.js
05-catalogs-muscles-videos-exercises.js
06-student-records.js
07-techniques.js
08-extra-items.js
09-navigation-search-init.js
```

### Onde editar cada coisa do Admin

| Arquivo | Responsabilidade |
|---|---|
| `00-bootstrap-elements-state.js` | Estado inicial, seleção de elementos e variáveis base |
| `01-admin-core-students.js` | Alunos, login/admin core e funções principais |
| `02-dashboard-profile.js` | Dashboard e perfil |
| `03-admin-events-documents.js` | Eventos e documentos dos alunos |
| `04-workout-builder.js` | Montagem de treinos, exercícios, séries, duplicação e alerta de saída |
| `05-catalogs-muscles-videos-exercises.js` | Catálogo de vídeos, exercícios e grupos musculares |
| `06-student-records.js` | Registros/histórico dos alunos |
| `07-techniques.js` | Técnicas de treino |
| `08-extra-items.js` | Itens extras do aluno |
| `09-navigation-search-init.js` | Navegação, buscas e inicialização |

---

### Aluno

O arquivo principal do aluno é:

```txt
web/assets/js/aluno.js
```

Ele carrega os módulos separados em:

```txt
web/assets/js/aluno/parts/
```

Arquivos do aluno:

```txt
00-service-worker-elements-state.js
01-tabs-menu-documents-overlay.js
02-install-flow.js
03-workouts-history.js
04-sync-and-init.js
```

### Onde editar cada coisa do Aluno

| Arquivo | Responsabilidade |
|---|---|
| `00-service-worker-elements-state.js` | Service worker, elementos principais e estado base |
| `01-tabs-menu-documents-overlay.js` | Menu, abas, documentos e overlay de PDF |
| `02-install-flow.js` | Fluxo de instalação PWA no Android/iOS |
| `03-workouts-history.js` | Treinos, execução e histórico do aluno |
| `04-sync-and-init.js` | Sincronização, eventos finais e inicialização |

---

## Organização do CSS

O CSS final do admin é:

```txt
web/assets/css/admin-clean.css
```

As partes editáveis ficam em:

```txt
web/assets/css/admin/parts/
```

Arquivos atuais:

```txt
00-base-layout.css
01-pro-pages.css
02-library-extra-items.css
03-searches-and-selects.css
04-workout-builder-steps.css
05-records-history.css
```

### Onde editar cada coisa do CSS do Admin

| Arquivo | Responsabilidade |
|---|---|
| `00-base-layout.css` | Layout base do painel admin |
| `01-pro-pages.css` | Telas internas, cards, painéis e páginas profissionais |
| `02-library-extra-items.css` | Biblioteca e itens extras |
| `03-searches-and-selects.css` | Buscas, selects e listas filtráveis |
| `04-workout-builder-steps.css` | Estilo da montagem de treino e etapas coloridas |
| `05-records-history.css` | Histórico dos alunos e registros agrupados |

---

## Instalação do projeto

### 1. Instalar dependências da raiz

Na pasta principal do projeto:

```bash
npm install
```

### 2. Instalar dependências do servidor

```bash
cd server
npm install
```

---

## Configuração do ambiente

Dentro da pasta `server`, existe o arquivo:

```txt
.env.example
```

Crie uma cópia chamada:

```txt
.env
```

Exemplo:

```bash
cp server/.env.example server/.env
```

Depois ajuste as variáveis conforme seu ambiente.

Exemplo comum:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5433/rf_training"
JWT_SECRET="sua_chave_secreta_aqui"
PORT=3000
```

> Nunca envie o arquivo `.env` para o GitHub ou para pacotes públicos.

---

## Banco de dados

O projeto usa PostgreSQL com Prisma.

### Subir banco com Docker

Na raiz do projeto:

```bash
docker compose up -d
```

### Aplicar schema do Prisma

Dentro da pasta `server`:

```bash
npm run db:push
```

### Popular dados iniciais

```bash
npm run db:seed
```

---

## Rodando em desenvolvimento

### Back-end

Na raiz do projeto:

```bash
npm run server:dev
```

Ou dentro de `server`:

```bash
npm run dev
```

### Front-end

O front-end está dentro da pasta:

```txt
web/
```

Em produção, essa pasta pode ser servida pelo NGINX ou por outro servidor estático.

---

## Build dos arquivos do front-end

Sempre que alterar os arquivos separados do admin, rode:

```bash
npm run build:admin
```

Sempre que alterar os arquivos separados do CSS do admin, rode:

```bash
npm run build:admin:css
```

Ou rode tudo:

```bash
npm run build:web
```

---

## Build do servidor

Na raiz:

```bash
npm run server:build
```

Ou dentro de `server`:

```bash
npm run build
```

Para iniciar o servidor compilado:

```bash
npm run server:start
```

---

## Deploy básico

### Front-end

Enviar a pasta `web/` para o diretório público do servidor.

Exemplo:

```bash
rsync -av --delete web/ /var/www/rf/
```

Depois recarregar o NGINX:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Back-end

No servidor:

```bash
cd server
npm install
npm run build
npm run db:push
npm run start
```

Em produção, o ideal é rodar o back-end com um gerenciador de processo, como PM2 ou systemd.

---

## Cuidados importantes

### 1. Não editar arquivos finais sem necessidade

Evite editar diretamente:

```txt
web/assets/js/admin.js
web/assets/css/admin-clean.css
```

Prefira editar os arquivos dentro de:

```txt
web/assets/js/admin/parts/
web/assets/css/admin/parts/
```

Depois gere os arquivos finais com:

```bash
npm run build:web
```

### 2. Depois de mudar arquivos PWA

Se alterar `service-worker.js`, `manifest.webmanifest`, ícones ou arquivos principais do app, pode ser necessário limpar cache do navegador ou reinstalar o PWA para ver a mudança.

### 3. Nunca versionar dados sensíveis

Não subir para o Git:

```txt
.env
node_modules/
dist/ se preferir gerar no deploy
```

---

## Fluxo recomendado de desenvolvimento

1. Abrir o projeto no VS Code.
2. Alterar os arquivos separados em `parts/`.
3. Rodar o build do front-end:

```bash
npm run build:web
```

4. Rodar o servidor em desenvolvimento:

```bash
npm run server:dev
```

5. Testar no navegador.
6. Fazer deploy.

---

## Resumo rápido dos comandos

| Comando | Função |
|---|---|
| `npm install` | Instala dependências da raiz |
| `cd server && npm install` | Instala dependências do servidor |
| `npm run build:web` | Regera JS/CSS finais do front-end |
| `npm run build:admin` | Regera apenas o JS final do admin |
| `npm run build:admin:css` | Regera apenas o CSS final do admin |
| `npm run server:dev` | Roda o servidor em desenvolvimento |
| `npm run server:build` | Compila o servidor |
| `npm run server:start` | Inicia o servidor compilado |
| `cd server && npm run db:push` | Aplica schema no banco |
| `cd server && npm run db:seed` | Popula dados iniciais |
| `docker compose up -d` | Sobe o banco pelo Docker |

---

## Status da organização

O projeto está organizado em uma estrutura mais limpa e escalável:

- Admin modularizado.
- Aluno modularizado.
- CSS do admin dividido por áreas.
- Scripts de build criados.
- `.env.example` criado.
- `.gitignore` criado.
- Estrutura documentada.

---

## Autor

Projeto desenvolvido para uso da consultoria online **RF Training / Renato Frutuoso**.
