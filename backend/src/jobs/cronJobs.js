const cron = require('node-cron');
const db = require('../db/database');
const { quizQueue } = require('../queues/quizQueue');

// Analisa as tentativas da semana e gera um simulado focado nos assuntos mais fracos
async function triggerRecoveryQuiz() {
  const attempts = db
    .prepare(
      `SELECT qa.quiz_id, qa.answers
       FROM quiz_attempts qa
       JOIN quizzes q ON qa.quiz_id = q.id
       WHERE qa.completed_at >= datetime('now', '-7 days')
         AND q.is_recovery = 0`,
    )
    .all();

  if (!attempts.length) {
    console.log('[Cron] Nenhuma tentativa encontrada nos últimos 7 dias.');
    return null;
  }

  // Conta erros por assunto
  const subjectErrors = {};

  for (const attempt of attempts) {
    const userAnswers = JSON.parse(attempt.answers);
    const questions = db
      .prepare(
        'SELECT order_index, correct_answer, subject FROM questions WHERE quiz_id = ? ORDER BY order_index',
      )
      .all(attempt.quiz_id);

    for (const q of questions) {
      if (!q.subject) continue;
      if (!subjectErrors[q.subject]) subjectErrors[q.subject] = 0;
      if (userAnswers[q.order_index] !== q.correct_answer) subjectErrors[q.subject]++;
    }
  }

  // Pega os 3 assuntos com mais erros
  const weakSubjects = Object.entries(subjectErrors)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([subject]) => subject);

  if (!weakSubjects.length) {
    console.log('[Cron] Nenhum assunto fraco identificado.');
    return null;
  }

  // Busca textos-fonte dos simulados que cobriram esses assuntos
  const placeholders = weakSubjects.map(() => '?').join(',');
  const sourceRows = db
    .prepare(
      `SELECT DISTINCT q.source_text
       FROM quizzes q
       JOIN questions qu ON q.id = qu.quiz_id
       WHERE qu.subject IN (${placeholders})
         AND q.is_recovery = 0
         AND q.source_text IS NOT NULL
       LIMIT 3`,
    )
    .all(...weakSubjects);

  if (!sourceRows.length) {
    console.log('[Cron] Nenhum texto-fonte encontrado para gerar recuperação.');
    return null;
  }

  const combinedText = sourceRows.map((r) => r.source_text).join('\n\n---\n\n');
  const title = `Recuperação — ${weakSubjects.join(', ')} — ${new Date().toLocaleDateString('pt-BR')}`;

  const { lastInsertRowid: quizId } = db
    .prepare(
      "INSERT INTO quizzes (title, source_text, num_questions, status, is_recovery) VALUES (?, ?, 10, 'pending', 1)",
    )
    .run(title, combinedText);

  await quizQueue.add('generate', { quizId, text: combinedText, numQuestions: 10 });

  console.log(`[Cron] Simulado de recuperação #${quizId} agendado. Foco: ${weakSubjects.join(', ')}`);
  return quizId;
}

// Executa todo domingo às 23:00
cron.schedule('0 23 * * 0', () => {
  console.log('[Cron] Iniciando geração semanal de simulado de recuperação...');
  triggerRecoveryQuiz().catch((err) => console.error('[Cron] Erro:', err.message));
});

console.log('[Cron] Agendamento ativo — todo domingo às 23h.');

module.exports = { triggerRecoveryQuiz };
