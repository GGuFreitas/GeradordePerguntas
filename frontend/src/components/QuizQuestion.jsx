export default function QuizQuestion({ question, index, selectedAnswer, onAnswer }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-indigo-400 text-xs font-mono mb-2">Questão {index + 1}</p>
      <p className="text-white font-medium mb-4 leading-relaxed">{question.question}</p>
      <div className="space-y-2">
        {question.options.map((option, i) => (
          <button
            key={i}
            onClick={() => onAnswer(i)}
            className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all ${
              selectedAnswer === i
                ? 'border-indigo-500 bg-indigo-950 text-white'
                : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'
            }`}
          >
            <span className="font-mono text-indigo-400 mr-2">
              {String.fromCharCode(65 + i)})
            </span>
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
