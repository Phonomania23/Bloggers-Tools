// /api/analytics/export-xlsx.js
import { Blob } from 'buffer';
import XLSX from 'xlsx';

// В Vercel нужно использовать динамический импорт для xlsx
// или использовать совместимую версию

export default async function handler(req, res) {
  const { dealId = 'ALL', from, to } = req.query;

  try {
    // Имитируем данные (замените на запрос к вашей БД)
    const series = mockSeries(from, to);
    const bloggers = mockBloggers();

    // Создаем новую книгу Excel
    const wb = XLSX.utils.book_new();

    // Лист "Сводка"
    const summaryData = series.map(r => ({
      'Дата': r.date,
      'Расход, ₽': r.spend_rub,
      'Выручка, ₽': r.revenue_rub,
      'Конверсии': r.conversions
    }));
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Сводка');

    // Лист "Блогеры"
    const bloggersData = bloggers.map(b => {
      const roi = b.spend_rub > 0 ? (b.revenue_rub - b.spend_rub) / b.spend_rub : 0;
      return {
        'Блогер': b.name,
        'Формат': b.format,
        'Показы': b.impressions,
        'Клики': b.clicks,
        'Конверсии': b.conversions,
        'Расход, ₽': b.spend_rub,
        'Выручка, ₽': b.revenue_rub,
        'ROI': roi
      };
    });
    const bloggersSheet = XLSX.utils.json_to_sheet(bloggersData);
    XLSX.utils.book_append_sheet(wb, bloggersSheet, 'Блогеры');

    // Генерируем буфер
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Отправляем файл
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="report_${dealId}_${from}_${to}.xlsx"`);
    res.send(buf);
  } catch (error) {
    console.error('Error generating XLSX:', error);
    res.status(500).json({ error: 'Failed to generate Excel file' });
  }
}

// Мок-данные (замените на реальные запросы к БД)
function mockSeries(from, to) {
  const start = from ? new Date(from) : new Date(Date.now() - 29 * 864e5);
  const end = to ? new Date(to) : new Date();
  const out = [];
  for (let d = new Date(start); d <= end; d = new Date(d.getTime() + 864e5)) {
    out.push({
      date: d.toISOString().slice(0, 10),
      spend_rub: 2000 + Math.round(Math.random() * 2000),
      revenue_rub: 4000 + Math.round(Math.random() * 5000),
      conversions: 20 + Math.round(Math.random() * 30)
    });
  }
  return out;
}

function mockBloggers() {
  const names = ['Иван Петров', 'Анна Сидорова', 'Сергей Козлов', 'Мария Иванова', 'Дмитрий Смирнов', 'Ольга Кузнецова', 'Алексей Попов', 'Елена Васнецова'];
  const formats = ['Интеграция', 'Шортс', 'Рилс', 'ТГ-пост', 'Влог'];
  return names.map((n, i) => ({
    name: n,
    format: formats[i % formats.length],
    impressions: 50000 + Math.round(Math.random() * 80000),
    clicks: 2000 + Math.round(Math.random() * 6000),
    conversions: 200 + Math.round(Math.random() * 400),
    spend_rub: 20000 + Math.round(Math.random() * 60000),
    revenue_rub: 30000 + Math.round(Math.random() * 120000)
  }));
}