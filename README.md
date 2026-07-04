# QuizForge — Gerador Automático de Simulados

Aplicação full-stack que usa **Inteligência Artificial** para criar questões de múltipla escolha a partir de qualquer texto. O projeto foi construído para demonstrar e estudar três conceitos avançados de back-end:

- **Filas de processamento** com BullMQ
- **Comunicação em tempo real** com WebSockets (Socket.io)
- **Tarefas agendadas** com Cron Jobs

---

## Sumário

1. [Por que essas tecnologias?](#1-por-que-essas-tecnologias)
2. [Como o fluxo funciona](#2-como-o-fluxo-funciona)
3. [Estrutura de arquivos](#3-estrutura-de-arquivos)
4. [Pré-requisitos](#4-pré-requisitos)
5. [Instalação e configuração](#5-instalação-e-configuração)
6. [Como rodar](#6-como-rodar)
7. [Rotas da API](#7-rotas-da-api)
8. [Banco de dados](#8-banco-de-dados)
9. [Como testar sem API key](#9-como-testar-sem-api-key)

---

## 1. Por que essas tecnologias?

### O problema com chamadas diretas à IA

Quando o usuário cola um texto e pede 10 questões, a requisição à OpenAI pode demorar **10 a 30 segundos**. Se você fizer isso diretamente no Express:

```
Usuário → POST /api/quizzes → Express chama OpenAI (aguarda 30s...) → responde
```

O problema é que o HTTP tem timeout, o usuário fica olhando para uma tela travada e, se a requisição cair, o processo morre no meio. Isso é uma péssima experiência.

### A solução: Fila + WebSocket

```
Usuário → POST /api/quizzes → Express cria job na fila → responde imediatamente com o ID
                                        ↓
                              Worker processa em segundo plano (30s)
                                        ↓
                              Socket.io avisa o frontend quando terminou
```

O usuário vê uma animação de carregamento e é **notificado automaticamente** quando o simulado está pronto, sem precisar ficar apertando F5.

---

## 2. Como o fluxo funciona

```
┌─────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (React)                           │
│                                                                     │
│  1. Usuário cola texto e clica "Gerar"                             │
│  2. POST /api/quizzes → recebe { quizId }                          │
│  3. Conecta ao Socket.io na sala "quiz-{id}"                       │
│  4. Exibe spinner animado                                           │
│  5. Recebe evento "quiz:ready" → busca as questões                 │
│  6. Renderiza as questões para o usuário responder                 │
└──────────────────────┬──────────────────────────────────────────────┘
                       │ HTTP + WebSocket
┌──────────────────────▼──────────────────────────────────────────────┐
│                       BACKEND (Node.js / Express)                   │
│                                                                     │
│  Express                 BullMQ Worker           node-cron          │
│  ┌──────────────┐       ┌──────────────────┐    ┌──────────────┐   │
│  │ POST /quizzes│──────▶│ Pega job da fila │    │ Todo domingo │   │
│  │              │       │ Chama OpenAI API │    │ às 23h:      │   │
│  │ Salva no DB  │       │ Salva questões   │    │ Gera simulado│   │
│  │ Cria job     │       │ Emite quiz:ready │    │ de recuperação│  │
│  └──────────────┘       └────────┬─────────┘    └──────────────┘   │
│                                  │                                  │
│  Socket.io ◀─────────────────────┘                                 │
│  (notifica o frontend)                                              │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
              ┌────────▼────────┐        ┌─────────────┐
              │  SQLite (DB)    │        │ Redis        │
              │  quizzes        │        │ (fila BullMQ)│
              │  questions      │        └─────────────┘
              │  quiz_attempts  │
              └─────────────────┘
```

---

## 3. Estrutura de arquivos

```
GeradordePerguntas/
│
├── docker-compose.yml          # Sobe o Redis (necessário para a fila)
│
├── backend/
│   ├── .env                    # Suas variáveis de ambiente (não sobe pro git)
│   ├── .env.example            # Modelo do .env
│   ├── quizforge.db            # Banco SQLite (criado automaticamente)
│   └── src/
│       ├── index.js            # Ponto de entrada: Express + Socket.io
│       │
│       ├── db/
│       │   └── database.js     # Abre o SQLite e cria as tabelas
│       │
│       ├── queues/
│       │   └── quizQueue.js    # Define a fila "quiz-generation" no Redis
│       │
│       ├── workers/
│       │   └── quizWorker.js   # Consome a fila e chama a IA
│       │
│       ├── services/
│       │   └── aiService.js    # Integração com OpenAI (ou mock sem API key)
│       │
│       ├── routes/
│       │   └── quizRoutes.js   # Todas as rotas REST da API
│       │
│       ├── socket/
│       │   └── socketManager.js # Guarda a instância do io para o worker usar
│       │
│       └── jobs/
│           └── cronJobs.js     # Tarefa agendada: gera simulado de recuperação
│
└── frontend/
    ├── index.html
    └── src/
        ├── App.jsx             # Roteamento das páginas
        ├── main.jsx            # Ponto de entrada do React
        ├── index.css           # Importa o Tailwind
        │
        ├── pages/
        │   ├── Home.jsx        # Formulário: colar texto + escolher nº de questões
        │   ├── Quiz.jsx        # Tela de espera + responder questões + gabarito
        │   └── History.jsx     # Histórico de simulados + assuntos fracos
        │
        ├── components/
        │   ├── Navbar.jsx      # Barra de navegação
        │   ├── QuizQuestion.jsx # Card de uma questão com alternativas clicáveis
        │   └── ScoreCard.jsx   # Gabarito com acertos, explicações e nota
        │
        ├── hooks/
        │   └── useSocket.js    # Hook para conectar ao Socket.io
        │
        └── services/
            └── api.js          # Funções que chamam a API do backend
```

---

## 4. Pré-requisitos

| Ferramenta | Versão mínima | Para que serve |
|-----------|---------------|----------------|
| Node.js   | v22.12+       | Rodar o backend e frontend |
| npm       | v8+           | Instalar dependências |
| Docker    | Qualquer      | Rodar o Redis |
| Docker Compose | Qualquer | Orquestrar o Redis |

> **Por que Node v22.12+?** Porque o projeto usa `node:sqlite`, um módulo SQLite **embutido no Node.js**. Isso elimina a necessidade de compilar dependências nativas no Windows.

---

## 5. Instalação e configuração

### 5.1. Clone ou baixe o projeto

```bash
cd C:\Projetos\GeradordePerguntas
```

### 5.2. Instale as dependências

```bash
# Backend
cd backend
npm install

# Frontend (abra outro terminal)
cd frontend
npm install
```

### 5.3. Configure o arquivo .env

```bash
# Dentro da pasta backend
cp .env.example .env
```

Abra o arquivo `backend/.env` e edite:

```env
# Chave da OpenAI — obtenha em https://platform.openai.com/api-keys
# Se deixar como está, o app usa questões de exemplo (modo demonstração)
OPENAI_API_KEY=sk-proj-...

REDIS_HOST=localhost
REDIS_PORT=6379
PORT=3001
FRONTEND_URL=http://localhost:5173
```

---

## 6. Como rodar

Você precisa de **3 terminais** abertos simultaneamente:

### Terminal 1 — Redis (via Docker)

```bash
docker compose up -d
```

Verifica se subiu:
```bash
docker compose ps
```

### Terminal 2 — Backend

```bash
cd backend
npm run dev
```

Você deve ver:
```
[Worker] Aguardando jobs na fila "quiz-generation"...
[Cron] Agendamento ativo — todo domingo às 23h.
✓ Servidor rodando em http://localhost:3001
```

### Terminal 3 — Frontend

```bash
cd frontend
npm run dev
```

Acesse: **http://localhost:5173**

---

## 7. Rotas da API

Base URL: `http://localhost:3001/api`

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/quizzes` | Cria um simulado e enfileira a geração |
| `GET` | `/quizzes/:id` | Retorna o status ou o simulado completo |
| `POST` | `/quizzes/:id/submit` | Corrige as respostas e salva a tentativa |
| `GET` | `/history` | Lista os últimos 30 simulados respondidos |
| `GET` | `/stats/weak-subjects` | Assuntos com pior desempenho nos últimos 7 dias |
| `POST` | `/admin/trigger-recovery` | Dispara manualmente o cron de recuperação |

### Exemplo: criar um simulado

```bash
curl -X POST http://localhost:3001/api/quizzes \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Biologia — Célula",
    "text": "A célula é a unidade fundamental da vida...",
    "numQuestions": 5
  }'
```

Resposta:
```json
{ "quizId": 1, "jobId": "1" }
```

### Eventos WebSocket

O frontend conecta em `ws://localhost:3001` e entra na sala `quiz-{id}`.

| Evento | Direção | Payload | Quando ocorre |
|--------|---------|---------|---------------|
| `join:quiz` | cliente → servidor | `quizId` | Ao abrir a página do simulado |
| `quiz:status` | servidor → cliente | `{ quizId, status }` | Quando o worker começa a processar |
| `quiz:ready` | servidor → cliente | `{ quizId }` | Quando as questões ficam prontas |
| `quiz:error` | servidor → cliente | `{ quizId, message }` | Se a geração falhar |

---

## 8. Banco de dados

O banco SQLite é criado automaticamente em `backend/quizforge.db` na primeira execução.

### Tabelas

**`quizzes`** — Um simulado gerado
```
id, title, source_text, status, num_questions, job_id, is_recovery, created_at
```
- `status`: `pending` → `processing` → `ready` (ou `failed`)
- `is_recovery`: `1` se foi gerado pelo cron de recuperação

**`questions`** — As questões de um simulado
```
id, quiz_id, question, options (JSON), correct_answer (índice 0-3), explanation, subject, order_index
```

**`quiz_attempts`** — Cada vez que um usuário responde um simulado
```
id, quiz_id, answers (JSON), score, total, percentage, completed_at
```

---

## 9. Como testar sem API key

Se você não tem uma chave da OpenAI, o app funciona em **modo demonstração**:

1. Deixe `OPENAI_API_KEY=sua-chave-openai-aqui` no `.env` (sem alterar)
2. Cole qualquer texto (mínimo 50 caracteres) e clique em "Gerar"
3. O sistema vai gerar questões de exemplo e o fluxo completo funciona normalmente:
   - Job entra na fila ✓
   - Worker processa ✓
   - WebSocket notifica ✓
   - Questões aparecem ✓
   - Gabarito é calculado ✓

Isso é ótimo para estudar o fluxo de **fila → worker → WebSocket** sem gastar créditos.

---

## Conceitos aprendidos neste projeto

### Filas (BullMQ + Redis)
- Por que usar: desacoplamento entre receber uma requisição e processar uma tarefa pesada
- Como funciona: o producer (Express) coloca jobs na fila, o consumer (Worker) os processa
- Redis é o "banco de dados" da fila, garantindo que nenhum job seja perdido

### WebSockets (Socket.io)
- Por que usar: comunicação bidirecional em tempo real (o servidor avisa o cliente)
- Diferença do HTTP: a conexão fica aberta, o servidor pode enviar dados sem ser perguntado
- Rooms: cada simulado tem sua própria sala (`quiz-{id}`), evitando que outros usuários recebam a notificação

### Cron Jobs (node-cron)
- Por que usar: executar tarefas em horários programados sem intervenção manual
- Sintaxe cron: `0 23 * * 0` = minuto 0, hora 23, todo dia *, todo mês *, dia 0 da semana (domingo)
- Caso de uso: análise semanal de desempenho e geração automática de simulados de recuperação

### node:sqlite (SQLite nativo no Node.js)
- Por que usar: banco simples e sem servidor, ótimo para projetos de estudo
- Por que `node:sqlite` e não `better-sqlite3`: em Windows, `better-sqlite3` precisa compilar código nativo (C++), o que exige o Visual Studio Build Tools
- O Node.js v22.12+ já vem com SQLite embutido via `require('node:sqlite')`
