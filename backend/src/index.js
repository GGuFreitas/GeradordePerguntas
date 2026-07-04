require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const { initSocket } = require('./socket/socketManager');
const quizRoutes = require('./routes/quizRoutes');

// Inicia o worker e o cron na mesma instância do servidor (ok para desenvolvimento)
require('./workers/quizWorker');
require('./jobs/cronJobs');

const app = express();
const server = http.createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Configura o Socket.io com suporte a CORS
const io = new Server(server, {
  cors: { origin: FRONTEND_URL, methods: ['GET', 'POST'] },
});

// Disponibiliza o io para o worker via socketManager
initSocket(io);

app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json({ limit: '2mb' }));
app.use('/api', quizRoutes);
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Quando o frontend conecta via Socket.io, ele entra na sala do simulado
io.on('connection', (socket) => {
  socket.on('join:quiz', (quizId) => {
    socket.join(`quiz-${quizId}`);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n✓ Servidor rodando em http://localhost:${PORT}`);
  console.log(`  Frontend esperado em ${FRONTEND_URL}\n`);
});
