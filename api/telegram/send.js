// /api/telegram/send.js — отправка сообщений в Telegram через Bot API
export default async function handler(req, res) {
  // Разрешаем только POST-запросы
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      ok: false, 
      error: 'Method not allowed. Use POST.' 
    });
  }

  try {
    const { text, chatId } = req.body;

    // Валидация обязательных полей
    if (!text) {
      return res.status(400).json({
        ok: false,
        error: 'Missing required field: text'
      });
    }

    // Проверка наличия токена бота
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      console.error('TELEGRAM_BOT_TOKEN is not configured');
      return res.status(500).json({
        ok: false,
        error: 'Telegram bot is not configured. Please contact administrator.'
      });
    }

    // Определяем chatId (из запроса или переменных окружения)
    const targetChatId = chatId || process.env.TELEGRAM_CHAT_ID;
    
    if (!targetChatId) {
      return res.status(400).json({
        ok: false,
        error: 'Chat ID is required. Either provide in request or set TELEGRAM_CHAT_ID environment variable.'
      });
    }

    // Подготавливаем текст сообщения
    const messageText = String(text).substring(0, 4096); // Ограничение Telegram

    // Отправка сообщения через Telegram Bot API
    const telegramUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: targetChatId,
        text: messageText,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        // Добавляем клавиатуру для быстрых действий
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '📊 Открыть панель',
                url: 'https://bloggers-tools.vercel.app/deal'
              }
            ]
          ]
        }
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      console.error('Telegram API error:', data);
      
      // Обработка специфичных ошибок Telegram
      let errorMessage = 'Failed to send Telegram message';
      if (data.description?.includes('chat not found')) {
        errorMessage = 'Chat not found. Please check the chat ID.';
      } else if (data.description?.includes('bot was blocked')) {
        errorMessage = 'Bot was blocked by the user.';
      }

      return res.status(500).json({
        ok: false,
        error: errorMessage,
        details: data.description
      });
    }

    // Успешная отправка
    console.log('Telegram message sent successfully:', {
      chat_id: targetChatId,
      message_length: messageText.length,
      message_id: data.result.message_id
    });

    return res.status(200).json({
      ok: true,
      message_id: data.result.message_id,
      chat_id: data.result.chat.id,
      message: 'Telegram message sent successfully'
    });

  } catch (error) {
    console.error('Telegram sending error:', error);
    
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
      sizeLimit: '10kb',
    },
  },
};