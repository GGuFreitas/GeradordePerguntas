import { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function History() {
  const [history, setHistory] = useState([]);
  const [weakSubjects, setWeakSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState(false);
  const [recoveryMsg, setRecoveryMsg] = useState('');

  useEffect(() => {
    Promise.all([api.getHistory(), api.getWeakSubjects()])
      .then(([h, w]) => {
        setHistory(h);
        setWeakSubjects(w);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function triggerRecovery() {
    setRecovering(true);
    setRecoveryMsg('');
    try {
      await api.triggerRecovery();
      setRecoveryMsg('Simulado de recuperação agendado! Aparecerá em breve no histórico.');
    } catch (err) {
      setRecoveryMsg(`Erro: ${err.message}`);
    } finally {
      setRecovering(false);
    }
  }

  if (loading) {
    return <p className="text-gray-400">Carregando histórico...</p>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {weakSubjects.length > 0 && (
        <div className="bg-amber-950 border border-amber-800 rounded-xl p-5">
          <h2 className="text-amber-300 font-semibold mb-1">
            Assuntos mais fracos — últimos 7 dias
          </h2>
          <p className="text-amber-600 text-xs mb-4">
            O cron job analisa esses dados todo domingo às 23h e gera um simulado de recuperação automaticamente.
          </p>
          <div className="space-y-3">
            {weakSubjects.map((s) => (
              <div key={s.subject} className="flex items-center justify-between gap-4">
                <span className="text-white text-sm truncate">{s.subject}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-28 bg-gray-800 rounded-full h-1.5">
                    <div
                      className="bg-amber-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${s.accuracy}%` }}
                    />
                  </div>
                  <span className="text-amber-300 text-sm w-10 text-right">{s.accuracy}%</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-amber-900">
            <button
              onClick={triggerRecovery}
              disabled={recovering}
              className="text-sm bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
            >
              {recovering ? 'Agendando...' : 'Gerar Recuperação agora (teste do cron)'}
            </button>
            {recoveryMsg && (
              <p className="text-amber-300 text-xs mt-2">{recoveryMsg}</p>
            )}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold text-white mb-4">Histórico de Simulados</h2>
        {history.length === 0 ? (
          <p className="text-gray-500">Você ainda não completou nenhum simulado.</p>
        ) : (
          <div className="space-y-3">
            {history.map((attempt) => (
              <div
                key={attempt.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium">{attempt.title}</p>
                    {attempt.is_recovery === 1 && (
                      <span className="text-xs bg-amber-900 text-amber-300 px-1.5 py-0.5 rounded">
                        Recuperação
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {new Date(attempt.completed_at).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p
                    className={`text-xl font-bold ${
                      attempt.percentage >= 70
                        ? 'text-green-400'
                        : attempt.percentage >= 50
                        ? 'text-yellow-400'
                        : 'text-red-400'
                    }`}
                  >
                    {Math.round(attempt.percentage)}%
                  </p>
                  <p className="text-gray-500 text-xs">
                    {attempt.score}/{attempt.total}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
