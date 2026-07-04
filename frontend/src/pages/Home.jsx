import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function Home() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { quizId } = await api.createQuiz(text, numQuestions, title);
      navigate(`/quiz/${quizId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = !loading && text.trim().length >= 50;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Novo Simulado</h1>
        <p className="text-gray-400">
          Cole qualquer texto e a IA vai gerar questões automaticamente.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Título <span className="text-gray-500">(opcional)</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="ex: Biologia — Genética"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Texto-base <span className="text-red-400">*</span>
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
            rows={12}
            placeholder="Cole aqui o conteúdo do livro, resumo de aula, artigo, documentação técnica..."
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none text-sm leading-relaxed"
          />
          <p className="text-xs text-gray-500 mt-1">
            {text.length} caracteres
            {text.length < 50 && text.length > 0 && (
              <span className="text-red-400"> — mínimo 50</span>
            )}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Número de questões:{' '}
            <span className="text-indigo-400 font-bold">{numQuestions}</span>
          </label>
          <input
            type="range"
            min={1}
            max={20}
            value={numQuestions}
            onChange={(e) => setNumQuestions(Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1 (rápido)</span>
            <span>20 (completo)</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-950 border border-red-800 text-red-300 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-6 py-3 transition-colors"
        >
          {loading ? 'Enviando para a fila...' : 'Gerar Simulado'}
        </button>
      </form>

      <div className="mt-10 border-t border-gray-800 pt-6">
        <p className="text-xs text-gray-600 text-center">
          O texto é enviado para uma fila de processamento. A IA gera as questões em segundo plano
          e você é avisado via WebSocket quando o simulado estiver pronto.
        </p>
      </div>
    </div>
  );
}
