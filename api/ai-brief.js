// /api/ai-brief.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ 
      ok: false, 
      error: 'Method Not Allowed' 
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const brief = body?.brief || {};

    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      // Use fallback if no API key
      const result = fallbackAnalyze(brief);
      return res.status(200).json({ 
        ok: true, 
        result: { ...result, source: "server-fallback" } 
      });
    }

    const systemPrompt = `Ты — эксперт по маркетингу и креативным стратегиям. 
Проанализируй бриф и предоставь рекомендации в формате JSON:
{
  "score": число 0-100,
  "issues": ["проблемы"],
  "questions": ["вопросы"],
  "suggestions": ["предложения"],
  "ideas": ["идеи"],
  "formats": ["форматы"]
}`;

    const userPrompt = JSON.stringify({ brief });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in response');
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(content);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      parsedResult = fallbackAnalyze(brief);
    }

    // Normalize response
    const result = {
      score: clampNum(parsedResult.score, 0, 100, 60),
      issues: arr(parsedResult.issues),
      questions: arr(parsedResult.questions),
      suggestions: arr(parsedResult.suggestions),
      ideas: arr(parsedResult.ideas),
      formats: arr(parsedResult.formats),
      source: "openai"
    };

    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.status(200).json({ ok: true, result });

  } catch (error) {
    console.error('API error:', error);
    const fallback = fallbackAnalyze({});
    return res.status(200).json({ 
      ok: true, 
      result: { ...fallback, source: "error-fallback", error: error.message } 
    });
  }
}

// Helper functions
function clampNum(n, min, max, def = 0) {
  const x = Number(n);
  return isNaN(x) ? def : Math.max(min, Math.min(max, Math.round(x)));
}

function arr(a) {
  return Array.isArray(a) ? a.map(x => String(x || '').trim()).filter(Boolean) : [];
}

function fallbackAnalyze(brief) {
  const goal = (brief.goal || "").trim();
  const budget = +brief.budget || 0;
  const deadline = (brief.deadline || "").trim();

  const issues = [];
  if (!goal) issues.push("Не указана цель кампании.");
  if (!budget) issues.push("Не указан бюджет.");
  if (!deadline) issues.push("Не указан дедлайн.");

  const suggestions = [
    "Добавьте описание целевой аудитории",
    "Уточните ключевые сообщения",
    "Определите метрики успеха"
  ];

  const ideas = [
    "Кейс-стади использования продукта",
    "Сравнение с конкурентами",
    "Обзор функциональности"
  ];

  const formats = ["Видео-обзор", "Социальные сети", "Блог-пост"];

  let score = 50;
  if (goal) score += 20;
  if (budget) score += 15;
  if (deadline) score += 10;

  return {
    score: Math.max(0, Math.min(100, score)),
    issues,
    questions: [
      "Кто целевая аудитория?",
      "Какие ключевые сообщения?",
      "Какие метрики успеха?"
    ],
    suggestions,
    ideas,
    formats
  };
}