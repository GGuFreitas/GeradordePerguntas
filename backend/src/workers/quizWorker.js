const { Worker } = require('bullmq');
const { connection } = require('../queues/quizQueue');
const db = require('../db/database');
const { generateQuizQuestions } = require('../services/aiService');
const { getIO } = require('../socket/socketManager');

const worker = new Worker(
  'quiz-generation',
  async (job) => {
    const { quizId, text, numQuestions } = job.data;

    // 1. Avisa o banco e o frontend que está processando
    db.prepare("UPDATE quizzes SET status = 'processing' WHERE id = ?").run(quizId);
    getIO().to(`quiz-${quizId}`).emit('quiz:status', { quizId, status: 'processing' });

    // 2. Chama a IA (parte demorada — por isso fica na fila!)
    const questions = await generateQuizQuestions(text, numQuestions);

    // 3. Salva as questões dentro de uma transaction (tudo ou nada)
    const insertQuestion = db.prepare(`
      INSERT INTO questions (quiz_id, question, options, correct_answer, explanation, subject, order_index)
      VALUES (@quizId, @question, @options, @correctAnswer, @explanation, @subject, @orderIndex)
    `);

    db.exec('BEGIN');
    try {
      questions.forEach((q, i) => {
        insertQuestion.run({
          quizId,
          question: q.question,
          options: JSON.stringify(q.options),
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || '',
          subject: q.subject || '',
          orderIndex: i,
        });
      });
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    // 4. Marca como pronto e notifica o frontend via WebSocket
    db.prepare("UPDATE quizzes SET status = 'ready' WHERE id = ?").run(quizId);
    getIO().to(`quiz-${quizId}`).emit('quiz:ready', { quizId });

    console.log(`[Worker] Simulado #${quizId} gerado com ${questions.length} questões.`);
  },
  { connection }
);

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} falhou:`, err.message);
  if (job?.data?.quizId) {
    db.prepare("UPDATE quizzes SET status = 'failed' WHERE id = ?").run(job.data.quizId);
    try {
      getIO().to(`quiz-${job.data.quizId}`).emit('quiz:error', {
        quizId: job.data.quizId,
        message: err.message,
      });
    } catch (_) {}
  }
});

console.log('[Worker] Aguardando jobs na fila "quiz-generation"...');

module.exports = worker;
