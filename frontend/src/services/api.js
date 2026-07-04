const BASE = 'http://localhost:3001/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro na requisição');
  return data;
}

export const api = {
  createQuiz: (text, numQuestions, title) =>
    request('/quizzes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, numQuestions, title }),
    }),

  getQuiz: (id) => request(`/quizzes/${id}`),

  submitQuiz: (id, answers) =>
    request(`/quizzes/${id}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    }),

  getHistory: () => request('/history'),

  getWeakSubjects: () => request('/stats/weak-subjects'),

  triggerRecovery: () => request('/admin/trigger-recovery', { method: 'POST' }),
};
