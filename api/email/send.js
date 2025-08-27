// /api/email/send.js — отправка email через Resend
export default async function handler(req, res) {
  // Разрешаем только POST-запросы
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      ok: false, 
      error: 'Method not allowed. Use POST.' 
    });
  }

  try {
    const { to, subject, html } = req.body;

    // Валидация обязательных полей
    if (!to || !subject || !html) {
      return res.status(400).json({
        ok: false,
        error: 'Missing required fields: to, subject, or html'
      });
    }

    // Проверка email формата
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({
        ok: false,
        error: 'Invalid email format'
      });
    }

    // Проверка наличия API ключа
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not configured');
      return res.status(500).json({
        ok: false,
        error: 'Email service is not configured. Please contact administrator.'
      });
    }

    // Отправка email через Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Bloggers.tools <noreply@bloggers.tools>',
        to: to,
        subject: subject,
        html: html,
        // Дополнительные опции для лучшей доставляемости
        headers: {
          'X-Entity-Ref-ID': `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Resend API error:', data);
      return res.status(500).json({
        ok: false,
        error: data.message || 'Failed to send email',
        details: data
      });
    }

    // Успешная отправка
    console.log('Email sent successfully:', {
      to: to,
      subject: subject,
      id: data.id
    });

    return res.status(200).json({
      ok: true,
      id: data.id,
      message: 'Email sent successfully'
    });

  } catch (error) {
    console.error('Email sending error:', error);
    
    return res.status(500).json({
      ok: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Обработчик для предварительных запросов (CORS)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};