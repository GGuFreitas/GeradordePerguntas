import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useSocket } from '../hooks/useSocket';
import QuizQuestion from '../components/QuizQuestion';
import ScoreCard from '../components/ScoreCard';

// phases: loading | waiting | taking | submitting | done | error
export default function Quiz() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [results, setResults] = useState(null);
  const [phase, setPhase] = useState('loading');
  const [errorMsg, setErrorMsg] = useState('');

  async function loadQuiz() {
    try {
      const data = await api.getQuiz(id);
      setQuiz(data);
      if (data.status === 'ready') {
        setAnswers(new Array(data.questions.length).fill(null));
        setPhase('taking');
      } else if (data.status === 'failed') {
        setErrorMsg('A geração do simulado falhou. Tente novamente.');
        setPhase('error');
      } else {
        setPhase('waiting');
      }
    } catch (err) {
      setErrorMsg(err.message);
      setPhase('error');
    }
  }

  useEffect(() => {
    loadQuiz();
  }, [id]);

  // Ouve eventos do servidor via WebSocket
  useSocket(id, {
    onStatus: ({ status }) => {
      if (status === 'processing') setPhase('waiting');
    },
    onReady: () => loadQuiz(),
    onError: ({ message }) => {
      setErrorMsg(message);
      setPhase('error');
    },
  });

  function setAnswer(index, value) {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  async function handleSubmit() {
    const unanswered = answers.filter((a) => a === null).length;
    if (unanswered > 0) {
      alert(`Você ainda tem ${unanswered} questão(ões) sem resposta!`);
      return;
    }
    setPhase('submitting');
    try {
      const data = await api.submitQuiz(id, answers);
      setResults(data);
      setPhase('done');
    } catch (err) {
      setErrorMsg(err.message);
      setPhase('error');
    }
  }

  if (phase === 'loading') {
    return <Spinner text="Carregando simulado..." />;
  }

  if (phase === 'waiting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 gap-6 text-center">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 border-4 border-indigo-900 rounded-full" />
          <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <div>
          <p className="text-white text-xl font-semibold">A IA está criando suas questões...</p>
          <p className="text-gray-400 mt-1 text-sm">Isso pode levar alguns segundos. Aguarde.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {['Analisando texto', 'Gerando questões', 'Revisando alternativas'].map((step, i) => (
            <span
              key={i}
              className="text-xs bg-gray-800 text-gray-400 px-3 py-1 rounded-full animate-pulse"
              style={{ animationDelay: `${i * 250}ms` }}
            >
              {step}
            </span>
          ))}
        </div>
        <p className="text-gray-600 text-xs">
          Você será notificado automaticamente via WebSocket quando estiver pronto.
        </p>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="text-center py-16">
        <p className="text-red-400 text-lg mb-4">{errorMsg}</p>
        <Link to="/" className="text-indigo-400 hover:text-indigo-300 underline text-sm">
          Voltar ao início
        </Link>
      </div>
    );
  }

  if (phase === 'done' && results) {
    return <ScoreCard quiz={quiz} results={results} onNewQuiz={() => navigate('/')} />;
  }

  const answered = answers.filter((a) => a !== null).length;
  const total = quiz?.questions?.length ?? 0;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">{quiz?.title}</h1>
        {quiz?.is_recovery === 1 && (
          <span className="inline-block mt-1 text-xs bg-amber-900 text-amber-300 px-2 py-0.5 rounded">
            Simulado de Recuperação
          </span>
        )}
        <p className="text-gray-400 text-sm mt-1">{total} questões</p>
      </div>

      <div className="space-y-6">
        {quiz?.questions?.map((q, i) => (
          <QuizQuestion
            key={q.id}
            question={q}
            index={i}
            selectedAnswer={answers[i]}
            onAnswer={(val) => setAnswer(i, val)}
          />
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-gray-800 pt-6">
        <p className="text-sm text-gray-400">
          <span className={answered === total ? 'text-green-400' : 'text-indigo-400'}>
            {answered}
          </span>
          /{total} respondidas
        </p>
        <button
          onClick={handleSubmit}
          disabled={phase === 'submitting'}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
        >
          {phase === 'submitting' ? 'Corrigindo...' : 'Finalizar Simulado'}
        </button>
      </div>
    </div>
  );
}

function Spinner({ text }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-gray-400">
      <div className="w-5 h-5 border-2 border-gray-600 border-t-indigo-400 rounded-full animate-spin" />
      {text}
    </div>
  );
}
