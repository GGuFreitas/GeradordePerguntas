import { Link } from 'react-router-dom';

const LETTERS = ['A', 'B', 'C', 'D'];

export default function ScoreCard({ quiz, results, onNewQuiz }) {
  const { score, total, percentage, results: details } = results;

  const colorClass =
    percentage >= 70 ? 'text-green-400' : percentage >= 50 ? 'text-yellow-400' : 'text-red-400';
  const label =
    percentage >= 70 ? 'Ótimo trabalho!' : percentage >= 50 ? 'Pode melhorar!' : 'Precisa revisar!';

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8 py-6 bg-gray-900 border border-gray-800 rounded-xl">
        <p className="text-gray-400 text-sm mb-2">{quiz?.title}</p>
        <div className={`text-6xl font-black ${colorClass} mb-1`}>
          {Math.round(percentage)}%
        </div>
        <p className={`text-base font-semibold ${colorClass}`}>{label}</p>
        <p className="text-gray-400 text-sm mt-1">
          {score} de {total} questões corretas
        </p>
      </div>

      <h2 className="text-white font-semibold mb-3">Gabarito</h2>
      <div className="space-y-3 mb-8">
        {details.map((r, i) => (
          <div
            key={i}
            className={`rounded-xl border p-4 ${
              r.isCorrect ? 'border-green-800 bg-green-950' : 'border-red-900 bg-red-950'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className={`text-lg leading-none mt-0.5 ${r.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                {r.isCorrect ? '✓' : '✗'}
              </span>
              <div className="flex-1">
                <p className="text-gray-400 text-xs mb-1">Questão {i + 1}</p>
                {!r.isCorrect && (
                  <p className="text-sm text-gray-300">
                    Sua resposta:{' '}
                    <span className="text-red-300 font-medium">
                      {r.selectedAnswer !== null ? LETTERS[r.selectedAnswer] : '—'}
                    </span>
                    {'  ·  '}
                    Correta:{' '}
                    <span className="text-green-300 font-medium">{LETTERS[r.correctAnswer]}</span>
                  </p>
                )}
                {r.explanation && (
                  <p className="text-gray-400 text-xs mt-2 italic leading-relaxed">
                    {r.explanation}
                  </p>
                )}
                {r.subject && (
                  <span className="inline-block mt-2 text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
                    {r.subject}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onNewQuiz}
          className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          Novo Simulado
        </button>
        <Link
          to="/history"
          className="flex-1 text-center bg-gray-800 hover:bg-gray-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          Ver Histórico
        </Link>
      </div>
    </div>
  );
}
