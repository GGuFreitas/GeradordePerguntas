const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { quizQueue } = require('../queues/quizQueue');

// POST /api/quizzes — cria um novo simulado e enfileira a geração
router.post('/quizzes', async (req, res) => {
  try {
    const { text, numQuestions = 5, title } = req.body;

    if (!text || text.trim().length < 50) {
      return res.status(400).json({ error: 'O texto deve ter pelo menos 50 caracteres.' });
    }
    if (numQuestions < 1 || numQuestions > 20) {
      return res.status(400).json({ error: 'Número de questões deve ser entre 1 e 20.' });
    }

    const { lastInsertRowid: quizId } = db
      .prepare('INSERT INTO quizzes (title, source_text, num_questions) VALUES (?, ?, ?)')
      .run(
        title?.trim() || `Simulado — ${new Date().toLocaleDateString('pt-BR')}`,
        text.trim(),
        numQuestions,
      );

    const job = await quizQueue.add('generate', { quizId, text: text.trim(), numQuestions });
    db.prepare('UPDATE quizzes SET job_id = ? WHERE id = ?').run(job.id, quizId);

    console.log(`[API] Simulado #${quizId} criado, job ${job.id} enfileirado.`);
    res.json({ quizId, jobId: job.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno ao criar simulado.' });
  }
});

// GET /api/quizzes/:id — retorna status ou simulado completo (quando pronto)
router.get('/quizzes/:id', (req, res) => {
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Simulado não encontrado.' });

  if (quiz.status !== 'ready') {
    return res.json({ id: quiz.id, title: quiz.title, status: quiz.status });
  }

  const questions = db
    .prepare(
      'SELECT id, question, options, order_index FROM questions WHERE quiz_id = ? ORDER BY order_index',
    )
    .all(quiz.id);

  res.json({
    id: quiz.id,
    title: quiz.title,
    status: quiz.status,
    is_recovery: quiz.is_recovery,
    questions: questions.map((q) => ({ ...q, options: JSON.parse(q.options) })),
  });
});

// POST /api/quizzes/:id/submit — corrige as respostas e salva a tentativa
router.post('/quizzes/:id/submit', (req, res) => {
  const { answers } = req.body;
  const quizId = Number(req.params.id);

  const questions = db
    .prepare(
      'SELECT order_index, correct_answer, explanation, subject FROM questions WHERE quiz_id = ? ORDER BY order_index',
    )
    .all(quizId);

  if (!questions.length) return res.status(404).json({ error: 'Questões não encontradas.' });

  let score = 0;
  const results = questions.map((q, i) => {
    const isCorrect = answers[i] === q.correct_answer;
    if (isCorrect) score++;
    return {
      index: i,
      selectedAnswer: answers[i] ?? null,
      correctAnswer: q.correct_answer,
      isCorrect,
      explanation: q.explanation,
      subject: q.subject,
    };
  });

  const percentage = (score / questions.length) * 100;

  db.prepare(
    'INSERT INTO quiz_attempts (quiz_id, answers, score, total, percentage) VALUES (?, ?, ?, ?, ?)',
  ).run(quizId, JSON.stringify(answers), score, questions.length, percentage);

  res.json({ score, total: questions.length, percentage, results });
});

// GET /api/history — histórico de tentativas do usuário
router.get('/history', (req, res) => {
  const attempts = db
    .prepare(
      `SELECT qa.id, qa.quiz_id, qa.score, qa.total, qa.percentage, qa.completed_at,
              q.title, q.is_recovery
       FROM quiz_attempts qa
       JOIN quizzes q ON qa.quiz_id = q.id
       ORDER BY qa.completed_at DESC
       LIMIT 30`,
    )
    .all();

  res.json(attempts);
});

// GET /api/stats/weak-subjects — assuntos com pior desempenho na última semana
router.get('/stats/weak-subjects', (req, res) => {
  const attempts = db
    .prepare(
      `SELECT qa.quiz_id, qa.answers
       FROM quiz_attempts qa
       JOIN quizzes q ON qa.quiz_id = q.id
       WHERE qa.completed_at >= datetime('now', '-7 days')
         AND q.is_recovery = 0`,
    )
    .all();

  const subjectMap = {};

  for (const attempt of attempts) {
    const userAnswers = JSON.parse(attempt.answers);
    const questions = db
      .prepare(
        'SELECT order_index, correct_answer, subject FROM questions WHERE quiz_id = ? ORDER BY order_index',
      )
      .all(attempt.quiz_id);

    for (const q of questions) {
      if (!q.subject) continue;
      if (!subjectMap[q.subject]) subjectMap[q.subject] = { correct: 0, total: 0 };
      subjectMap[q.subject].total++;
      if (userAnswers[q.order_index] === q.correct_answer) subjectMap[q.subject].correct++;
    }
  }

  const stats = Object.entries(subjectMap)
    .map(([subject, s]) => ({
      subject,
      accuracy: s.total ? Math.round((s.correct / s.total) * 100) : 0,
      correct: s.correct,
      total: s.total,
    }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 5);

  res.json(stats);
});

// POST /api/admin/trigger-recovery — disparo manual do cron (para testes)
router.post('/admin/trigger-recovery', async (req, res) => {
  try {
    const { triggerRecoveryQuiz } = require('../jobs/cronJobs');
    await triggerRecoveryQuiz();
    res.json({ message: 'Simulado de recuperação agendado com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
