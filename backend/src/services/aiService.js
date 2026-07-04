const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateQuizQuestions(text, numQuestions) {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sua-chave-openai-aqui') {
    console.log('[IA] OPENAI_API_KEY não configurada — usando questões de demonstração.');
    return buildMockQuestions(numQuestions);
  }

  const prompt = `Você é um professor especialista em criar avaliações educacionais.
Dado o texto abaixo, crie exatamente ${numQuestions} questões de múltipla escolha em português brasileiro.

Retorne APENAS um JSON válido no seguinte formato (sem markdown, sem texto extra):
{
  "questions": [
    {
      "question": "Texto completo da pergunta?",
      "options": ["Opção A", "Opção B", "Opção C", "Opção D"],
      "correctAnswer": 0,
      "explanation": "Explicação clara do porquê essa alternativa está correta.",
      "subject": "Tópico curto (ex: Fotossíntese, Revolução Industrial)"
    }
  ]
}

Regras obrigatórias:
- correctAnswer é o índice numérico (0, 1, 2 ou 3) da opção correta
- Crie exatamente 4 alternativas por questão
- Baseie as questões no texto fornecido
- As alternativas incorretas devem ser plausíveis, não absurdas

Texto:
${text.slice(0, 12000)}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });

  const parsed = JSON.parse(response.choices[0].message.content);

  if (!Array.isArray(parsed.questions)) {
    throw new Error('A IA retornou um formato de JSON inválido.');
  }

  return parsed.questions.slice(0, numQuestions);
}

function buildMockQuestions(count) {
  return Array.from({ length: count }, (_, i) => ({
    question: `Questão ${i + 1} (demonstração): Qual das alternativas abaixo representa a ideia central do texto?`,
    options: [
      'Esta é a resposta correta — configure a OPENAI_API_KEY para questões reais.',
      'Alternativa incorreta de exemplo.',
      'Outra alternativa incorreta de exemplo.',
      'Mais uma alternativa incorreta de exemplo.',
    ],
    correctAnswer: 0,
    explanation:
      'Esta questão foi gerada automaticamente pois nenhuma OPENAI_API_KEY foi configurada. ' +
      'Copie o arquivo .env.example para .env e adicione sua chave.',
    subject: 'Demonstração',
  }));
}

module.exports = { generateQuizQuestions };
