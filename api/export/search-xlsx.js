const FIELDS = [
  'id', 'name', 'username', 'platform', 'category', 
  'followers', 'er', 'avg_views', 'price', 'geo',
  'audience_geo', 'content_language', 'email', 'verified',
  'aqs', 'last_post_date', 'content_types', 'posts_per_week',
  'audience_age', 'audience_gender', 'blogger_age', 'blogger_gender'
];

// Эвристика для вычисления AQS если нет в данных
function computeAqsLite(blogger) {
  // Простая формула на основе ER и роста
  const baseScore = blogger.er * 10;
  const growthBonus = blogger.growthRate ? Math.min(blogger.growthRate * 2, 30) : 0;
  return Math.min(baseScore + growthBonus, 100).toFixed(1);
}

function filterByIds(list, idsCsv) {
  if (!idsCsv) return list;
  const set = new Set(String(idsCsv).split(',').map(x => x.trim()).filter(Boolean));
  if (!set.size) return list;
  return list.filter(b => set.has(String(b.id)));
}

function filterByQuery(list, query) {
  if (!query) return list;
  const q = query.toLowerCase();
  return list.filter(b => 
    (b.name && b.name.toLowerCase().includes(q)) ||
    (b.username && b.username.toLowerCase().includes(q)) ||
    (b.category && b.category.toLowerCase().includes(q)) ||
    (b.platform && b.platform.toLowerCase().includes(q))
  );
}

function pickRow(blogger) {
  return {
    id: blogger.id || '',
    name: blogger.name || '',
    username: blogger.username || '',
    platform: blogger.platform || '',
    category: blogger.category || '',
    followers: blogger.followers || 0,
    er: blogger.er || 0,
    avg_views: blogger.avgViews || Math.round(blogger.followers * (blogger.er || 0) / 100),
    price: blogger.price || 0,
    geo: blogger.geo || '',
    audience_geo: blogger.audienceGeo || blogger.geo || '',
    content_language: blogger.contentLanguage || '',
    email: blogger.email || '',
    verified: blogger.verified === 'yes' ? 'Да' : 'Нет',
    aqs: blogger.aqs || computeAqsLite(blogger),
    last_post_date: blogger.lastPostDate || '',
    content_types: Array.isArray(blogger.contentFormats) ? blogger.contentFormats.join(', ') : '',
    posts_per_week: blogger.postsPerWeek || 0,
    audience_age: blogger.audienceAge || '',
    audience_gender: blogger.audienceGender === 'male' ? 'Мужской' : blogger.audienceGender === 'female' ? 'Женский' : 'Смешанный',
    blogger_age: blogger.bloggerAge || '',
    blogger_gender: blogger.bloggerGender === 'male' ? 'Мужской' : 'Женский'
  };
}

function toCsv(rows) {
  const esc = v => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (s.includes('"') || s.includes(',') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  
  const head = FIELDS.map(f => {
    // Русские названия для CSV
    const headersMap = {
      'id': 'ID',
      'name': 'Имя',
      'username': 'Username',
      'platform': 'Платформа',
      'category': 'Категория',
      'followers': 'Подписчики',
      'er': 'ER (%)',
      'avg_views': 'Средние просмотры',
      'price': 'Цена (USD)',
      'geo': 'Гео блогера',
      'audience_geo': 'Гео аудитории',
      'content_language': 'Язык контента',
      'email': 'Email',
      'verified': 'Верифицирован',
      'aqs': 'AQS',
      'last_post_date': 'Последний пост',
      'content_types': 'Форматы контента',
      'posts_per_week': 'Постов/неделю',
      'audience_age': 'Возраст аудитории',
      'audience_gender': 'Пол аудитории',
      'blogger_age': 'Возраст блогера',
      'blogger_gender': 'Пол блогера'
    };
    return esc(headersMap[f] || f);
  }).join(',');
  
  const body = rows.map(r => FIELDS.map(f => esc(r[f])).join(',')).join('\n');
  return head + '\n' + body + '\n';
}

function toXlsxBuffer(rows) {
  let XLSX = null;
  try { 
    XLSX = require('xlsx'); 
  } catch (_) { 
    return null; 
  }
  
  // Подготовка данных с русскими заголовками
  const headersMap = {
    'id': 'ID',
    'name': 'Имя',
    'username': 'Username',
    'platform': 'Платформа',
    'category': 'Категория',
    'followers': 'Подписчики',
    'er': 'ER (%)',
    'avg_views': 'Средние просмотры',
    'price': 'Цена (USD)',
    'geo': 'Гео блогера',
    'audience_geo': 'Гео аудитории',
    'content_language': 'Язык контента',
    'email': 'Email',
    'verified': 'Верифицирован',
    'aqs': 'AQS',
    'last_post_date': 'Последний пост',
    'content_types': 'Форматы контента',
    'posts_per_week': 'Постов/неделю',
    'audience_age': 'Возраст аудитории',
    'audience_gender': 'Пол аудитории',
    'blogger_age': 'Возраст блогера',
    'blogger_gender': 'Пол блогера'
  };
  
  const headers = FIELDS.map(f => headersMap[f] || f);
  const aoa = [headers, ...rows.map(r => FIELDS.map(f => r[f]))];
  
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Блогеры');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

function loadDb() {
  // Загрузка данных из вашего JSON
  try {
    const fs = require('fs');
    const path = require('path');
    const dbPath = path.join(process.cwd(), 'json', 'bloggers.json');
    const data = fs.readFileSync(dbPath, 'utf8');
    const jsonData = JSON.parse(data);
    
    // Поддержка разных структур JSON
    if (Array.isArray(jsonData)) {
      return jsonData;
    } else if (jsonData && Array.isArray(jsonData.bloggers)) {
      return jsonData.bloggers;
    } else if (jsonData && Array.isArray(jsonData.data)) {
      return jsonData.data;
    }
    
    return [];
  } catch (error) {
    console.error('Error loading database:', error);
    return [];
  }
}

module.exports = (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const { ids, q, format = 'xlsx' } = req.query;
  const db = loadDb();
  let list = db.slice();
  
  if (ids) {
    list = filterByIds(list, ids);
  } else if (q) {
    list = filterByQuery(list, q);
  }

  const rows = list.map(pickRow);
  const ts = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);

  if (String(format).toLowerCase() === 'csv') {
    const csv = toCsv(rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="bloggers-export-${ts}.csv"`);
    res.status(200).send(csv);
    return;
  }

  const buf = toXlsxBuffer(rows);
  if (buf) {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="bloggers-export-${ts}.xlsx"`);
    res.status(200).send(buf);
  } else {
    // Fallback: CSV, если нет зависимости xlsx
    const csv = toCsv(rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="bloggers-export-${ts}.csv"`);
    res.status(200).send(csv);
  }
};