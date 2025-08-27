// Combines JSON seeds into one database for json-server
module.exports = () => ({
  bloggers: require('../json/bloggers.json'),
  deals: require('../json/deals.json'),
  emails: require('../json/emails.json'),
  
  // Добавленные эндпоинты для аналитики
  "analytics/kpis": { 
    spend: 350000, 
    revenue: 520000, 
    roi: (520000-350000)/350000, 
    conv: 2480,
    spend_rub: 350000,
    revenue_rub: 520000,
    conversions: 2480
  },
  "analytics/series": [
    { date:"2025-06-01", spend:28000, revenue:41000, conversions:210, spend_rub:28000, revenue_rub:41000 },
    { date:"2025-06-04", spend:30000, revenue:52000, conversions:240, spend_rub:30000, revenue_rub:52000 },
    { date:"2025-06-07", spend:32000, revenue:44000, conversions:190, spend_rub:32000, revenue_rub:44000 },
    { date:"2025-06-10", spend:29000, revenue:50000, conversions:220, spend_rub:29000, revenue_rub:50000 },
    { date:"2025-06-13", spend:31000, revenue:53000, conversions:230, spend_rub:31000, revenue_rub:53000 },
    { date:"2025-06-16", spend:33000, revenue:56000, conversions:260, spend_rub:33000, revenue_rub:56000 },
    { date:"2025-06-19", spend:34000, revenue:54000, conversions:250, spend_rub:34000, revenue_rub:54000 },
    { date:"2025-06-22", spend:36000, revenue:59000, conversions:270, spend_rub:36000, revenue_rub:59000 },
    { date:"2025-06-25", spend:37000, revenue:60000, conversions:260, spend_rub:37000, revenue_rub:60000 },
    { date:"2025-06-28", spend:39000, revenue:64000, conversions:280, spend_rub:39000, revenue_rub:64000 },
    { date:"2025-07-01", spend:41000, revenue:70000, conversions:300, spend_rub:41000, revenue_rub:70000 },
    { date:"2025-07-04", spend:43000, revenue:71000, conversions:270, spend_rub:43000, revenue_rub:71000 },
  ],
  "analytics/bloggers": [
    { name:'Иван Петров', spend:120000, revenue:210000, conversions:430, spend_rub:120000, revenue_rub:210000, format:'Интеграция', impressions:150000, clicks:7500 },
    { name:'Анна Сидорова', spend:80000, revenue:170000, conversions:390, spend_rub:80000, revenue_rub:170000, format:'Shorts', impressions:120000, clicks:6000 },
    { name:'Сергей Козлов', spend:160000, revenue:220000, conversions:350, spend_rub:160000, revenue_rub:220000, format:'Рилс', impressions:180000, clicks:9000 },
    { name:'Мария Иванова', spend:90000, revenue:95000, conversions:180, spend_rub:90000, revenue_rub:95000, format:'ТГ-пост', impressions:80000, clicks:4000 },
    { name:'Алексей Попов', spend:110000, revenue:140000, conversions:240, spend_rub:110000, revenue_rub:140000, format:'Влог', impressions:130000, clicks:6500 }
  ],
  "analytics/formats": [
    { format:'Интеграция в ролик', spend:220000, revenue:330000, spend_rub:220000, revenue_rub:330000 },
    { format:'Shorts/Reels', spend:140000, revenue:260000, spend_rub:140000, revenue_rub:260000 },
    { format:'Стрим', spend:90000, revenue:110000, spend_rub:90000, revenue_rub:110000 },
    { format:'Stories', spend:70000, revenue:60000, spend_rub:70000, revenue_rub:60000 }
  ],
  "analytics/forecast": [
    { date:"2025-07-05", revenue:72000, conversions:275, revenue_rub:72000 },
    { date:"2025-07-06", revenue:73500, conversions:280, revenue_rub:73500 },
    { date:"2025-07-07", revenue:75000, conversions:285, revenue_rub:75000 },
    { date:"2025-07-08", revenue:76500, conversions:290, revenue_rub:76500 },
    { date:"2025-07-09", revenue:78000, conversions:295, revenue_rub:78000 },
    { date:"2025-07-10", revenue:79500, conversions:300, revenue_rub:79500 },
    { date:"2025-07-11", revenue:81000, conversions:305, revenue_rub:81000 },
    { date:"2025-07-12", revenue:82500, conversions:310, revenue_rub:82500 },
    { date:"2025-07-13", revenue:84000, conversions:315, revenue_rub:84000 },
    { date:"2025-07-14", revenue:85500, conversions:320, revenue_rub:85500 },
    { date:"2025-07-15", revenue:87000, conversions:325, revenue_rub:87000 },
    { date:"2025-07-16", revenue:88500, conversions:330, revenue_rub:88500 },
    { date:"2025-07-17", revenue:90000, conversions:335, revenue_rub:90000 },
    { date:"2025-07-18", revenue:91500, conversions:340, revenue_rub:91500 }
  ]
});