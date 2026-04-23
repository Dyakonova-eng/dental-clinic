/* ============================================
   WEBHOOK HANDLER — Smile Clinic
   Middleware для обработки и маршрутизации заявок
   
   Запуск: node webhook-handler.js
   Требования: npm install express cors
   ============================================ */

const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();
app.use(cors());
app.use(express.json());

// ===== КОНФИГУРАЦИЯ =====
const CONFIG = {
  PORT: 3000,
  TELEGRAM_BOT_TOKEN: 'ВСТАВЬТЕ_ТОКЕН_БОТА',
  TELEGRAM_CHAT_ID: 'ВСТАВЬТЕ_CHAT_ID',
  MAKE_WEBHOOK_URL: 'https://hook.eu1.make.com/ВСТАВЬТЕ_WEBHOOK_ID',
  GOOGLE_SCRIPT_URL: '' // Google Apps Script URL (опционально)
};

// ===== ХРАНИЛИЩЕ =====
const leadsDB = [];

// ===== КЛАССИФИКАЦИЯ ЛИДОВ =====
function classifyLead(data) {
  const hotServices = ['implant', 'prosthetics', 'orthodontics'];
  const warmServices = ['treatment', 'whitening'];
  
  let priority = 'standard';
  let score = 0;
  
  // По услуге
  if (hotServices.includes(data.service)) {
    priority = 'hot';
    score += 30;
  } else if (warmServices.includes(data.service)) {
    priority = 'warm';
    score += 15;
  }
  
  // По бюджету (из квиза)
  if (data.quizData) {
    if (['premium', 'high'].includes(data.quizData.budget)) {
      priority = 'hot';
      score += 25;
    }
    // По срочности
    if (data.quizData.concern === 'pain') {
      score += 20; // Боль = срочно
    }
    if (data.quizData.concern === 'restoration') {
      score += 20; // Восстановление = дорого
    }
  }
  
  // По комментарию (keywords)
  const comment = (data.comment || '').toLowerCase();
  const urgentKeywords = ['срочно', 'болит', 'сильно', 'сегодня', 'помогите', 'острая'];
  if (urgentKeywords.some(kw => comment.includes(kw))) {
    priority = 'hot';
    score += 15;
  }
  
  return { priority, score };
}

// ===== ОЦЕНКА СТОИМОСТИ =====
function estimateValue(service) {
  const values = {
    'implant': { min: 35000, max: 150000, avg: 75000 },
    'treatment': { min: 4500, max: 20000, avg: 10000 },
    'hygiene': { min: 5500, max: 8000, avg: 6500 },
    'whitening': { min: 15000, max: 25000, avg: 18000 },
    'prosthetics': { min: 20000, max: 200000, avg: 80000 },
    'orthodontics': { min: 80000, max: 300000, avg: 150000 },
    'consultation': { min: 0, max: 0, avg: 0 }
  };
  return values[service] || { min: 0, max: 0, avg: 5000 };
}

// ===== МАРШРУТ: ПРИЁМ ЗАЯВКИ =====
app.post('/api/lead', async (req, res) => {
  try {
    const data = req.body;
    
    // Валидация
    if (!data.name || !data.phone) {
      return res.status(400).json({ error: 'Имя и телефон обязательны' });
    }
    
    // Классификация
    const classification = classifyLead(data);
    const value = estimateValue(data.service);
    
    const lead = {
      id: `lead_${Date.now()}`,
      ...data,
      leadType: classification.priority,
      leadScore: classification.score,
      estimatedValue: value,
      status: 'new',
      createdAt: new Date().toISOString(),
      notifications: []
    };
    
    // Сохранить
    leadsDB.push(lead);
    
    // Параллельно отправить во все каналы
    const tasks = [
      sendTelegramNotification(lead),
      forwardToMake(lead),
      // sendSMSConfirmation(lead) // Раскомментируйте при подключении SMS-сервиса
    ];
    
    await Promise.allSettled(tasks);
    
    console.log(`✅ Lead ${lead.id} processed: ${lead.leadType} (score: ${lead.leadScore})`);
    
    res.json({
      success: true,
      leadId: lead.id,
      message: 'Заявка получена! Мы свяжемся с вами в ближайшее время.'
    });
    
  } catch (error) {
    console.error('❌ Error processing lead:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// ===== МАРШРУТ: СПИСОК ЗАЯВОК =====
app.get('/api/leads', (req, res) => {
  const { status, type, date } = req.query;
  
  let filtered = [...leadsDB];
  
  if (status) filtered = filtered.filter(l => l.status === status);
  if (type) filtered = filtered.filter(l => l.leadType === type);
  if (date) filtered = filtered.filter(l => l.createdAt.startsWith(date));
  
  res.json({
    total: filtered.length,
    leads: filtered.sort((a, b) => b.leadScore - a.leadScore)
  });
});

// ===== МАРШРУТ: СТАТИСТИКА =====
app.get('/api/stats', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const todayLeads = leadsDB.filter(l => l.createdAt.startsWith(today));
  
  const stats = {
    total: todayLeads.length,
    hot: todayLeads.filter(l => l.leadType === 'hot').length,
    warm: todayLeads.filter(l => l.leadType === 'warm').length,
    standard: todayLeads.filter(l => l.leadType === 'standard').length,
    confirmed: todayLeads.filter(l => l.status === 'confirmed').length,
    totalEstimatedValue: todayLeads.reduce((sum, l) => sum + (l.estimatedValue?.avg || 0), 0),
    averageScore: todayLeads.length > 0 
      ? Math.round(todayLeads.reduce((sum, l) => sum + l.leadScore, 0) / todayLeads.length) 
      : 0
  };
  
  res.json(stats);
});

// ===== TELEGRAM NOTIFICATION =====
async function sendTelegramNotification(lead) {
  const isHot = lead.leadType === 'hot';
  const emoji = isHot ? '🔥🔥🔥' : lead.leadType === 'warm' ? '🟡' : '📋';
  
  const serviceName = {
    'implant': '🦷 Имплантация',
    'treatment': '💊 Лечение',
    'hygiene': '✨ Гигиена',
    'whitening': '💎 Отбеливание',
    'prosthetics': '👑 Протезирование',
    'orthodontics': '😁 Ортодонтия',
    'consultation': '📋 Консультация'
  }[lead.service] || lead.service || 'Не указана';
  
  const message = `${emoji} <b>${isHot ? 'ГОРЯЧАЯ ЗАЯВКА!' : 'Новая заявка'}</b>

👤 <b>${lead.name}</b>
📞 ${lead.phone}
🏥 ${serviceName}
📅 ${lead.date || 'не указана'} в ${lead.time || 'не указано'}
💬 ${lead.comment || '—'}

💰 Чек: <b>${lead.estimatedValue.min.toLocaleString()} – ${lead.estimatedValue.max.toLocaleString()} ₽</b>
📊 Скоринг: ${lead.leadScore} баллов
🧠 Квиз: ${lead.quizCompleted ? 'Пройден' : 'Нет'}

📅 ${new Date().toLocaleString('ru-RU')}
${isHot ? '\n⚠️ <b>ПЕРЕЗВОНИТЕ В ТЕЧЕНИЕ 5 МИНУТ!</b>' : ''}`;

  const url = `https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage`;
  
  const body = JSON.stringify({
    chat_id: CONFIG.TELEGRAM_CHAT_ID,
    text: message,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📞 Перезвонить', callback_data: `call_${lead.id}` },
          { text: '✅ Подтвердить', callback_data: `confirm_${lead.id}` }
        ]
      ]
    }
  });

  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ===== FORWARD TO MAKE =====
async function forwardToMake(lead) {
  if (!CONFIG.MAKE_WEBHOOK_URL || CONFIG.MAKE_WEBHOOK_URL.includes('ВСТАВЬТЕ')) return;
  
  return new Promise((resolve, reject) => {
    const url = new URL(CONFIG.MAKE_WEBHOOK_URL);
    const body = JSON.stringify(lead);
    
    const req = https.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ===== ЗАПУСК =====
app.listen(CONFIG.PORT, () => {
  console.log(`🌐 Smile Clinic Webhook Handler running on port ${CONFIG.PORT}`);
  console.log(`📡 Endpoint: http://localhost:${CONFIG.PORT}/api/lead`);
  console.log(`📊 Stats: http://localhost:${CONFIG.PORT}/api/stats`);
});
