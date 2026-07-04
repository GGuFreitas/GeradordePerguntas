const { Queue } = require('bullmq');

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
};

// A fila onde todos os jobs de geração de simulado são enfileirados
const quizQueue = new Queue('quiz-generation', { connection });

module.exports = { quizQueue, connection };
