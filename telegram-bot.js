/* ============================================
   TELEGRAM BOT — Smile Clinic
   Обработка callback-кнопок и уведомления
   
   Запуск: node telegram-bot.js
   Требования: npm install node-telegram-bot-api
   ============================================ */

// ===== КОНФИГУРАЦИЯ =====
const CONFIG = {
  BOT_TOKEN: 'ВСТАВЬТЕ_ТОКЕН_БОТА', // Получите у @BotFather
  OWNER_CHAT_ID: 'ВСТАВЬТЕ_CHAT_ID',  // Ваш chat_id (получите у @userinfobot)
  CLINIC_NAME: 'Smile Clinic',
  CLINIC_PHONE: '+7 (495) 123-45-67'
};

// ===== ИНИЦИАЛИЗАЦИЯ =====
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(CONFIG.BOT_TOKEN, { polling: true });

console.log('🤖 Smile Clinic Bot запущен!');

// ===== ХРАНИЛИЩЕ ЗАЯВОК (в памяти, для production используйте БД) =====
const leads = new Map();

// ===== КОМАНДЫ =====

// /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `
🦷 <b>Smile Clinic Bot</b>

Этот бот помогает управлять заявками с сайта.

<b>Команды:</b>
/stats — статистика заявок за сегодня
/hot — горячие заявки (без ответа)
/all — все заявки за сегодня
/help — помощь

<b>Ваш Chat ID:</b> <code>${chatId}</code>
(используйте его в настройках Make)
  `, { parse_mode: 'HTML' });
});

// /stats
bot.onText(/\/stats/, (msg) => {
  const today = new Date().toISOString().split('T')[0];
  const todayLeads = [...leads.values()].filter(l => l.date === today);
  const hot = todayLeads.filter(l => l.leadType === 'hot');
  const warm = todayLeads.filter(l => l.leadType === 'warm');
  const standard = todayLeads.filter(l => l.leadType === 'standard');
  const confirmed = todayLeads.filter(l => l.status === 'confirmed');
  
  bot.sendMessage(msg.chat.id, `
📊 <b>Статистика за сегодня</b>

📋 Всего заявок: <b>${todayLeads.length}</b>
🔥 Горячих: <b>${hot.length}</b>
🟡 Тёплых: <b>${warm.length}</b>
📋 Стандартных: <b>${standard.length}</b>

✅ Подтверждены: <b>${confirmed.length}</b>
⏳ Ожидают: <b>${todayLeads.length - confirmed.length}</b>

💰 Ожидаемая выручка: расчёт по заявкам
  `, { parse_mode: 'HTML' });
});

// /hot — необработанные горячие
bot.onText(/\/hot/, (msg) => {
  const hotLeads = [...leads.values()].filter(l => l.leadType === 'hot' && l.status !== 'confirmed');
  
  if (hotLeads.length === 0) {
    bot.sendMessage(msg.chat.id, '✅ Нет необработанных горячих заявок!');
    return;
  }
  
  hotLeads.forEach(lead => {
    bot.sendMessage(msg.chat.id, `
🔥 <b>Горячая заявка (без ответа)</b>

👤 ${lead.name}
📞 ${lead.phone}
🏥 ${lead.service}
⏰ Заявка от: ${lead.time}

💰 Чек: ${lead.estimatedValue}
    `, {
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
  });
});

// ===== ОБРАБОТКА CALLBACK-КНОПОК =====
bot.on('callback_query', (query) => {
  const data = query.data;
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  
  // Подтверждение заявки
  if (data.startsWith('confirm_')) {
    const leadId = data.replace('confirm_', '');
    const lead = leads.get(leadId);
    
    if (lead) {
      lead.status = 'confirmed';
      lead.confirmedAt = new Date().toISOString();
    }
    
    bot.editMessageText(
      query.message.text + '\n\n✅ <b>ПОДТВЕРЖДЕНО</b> в ' + new Date().toLocaleTimeString('ru-RU'),
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML'
      }
    );
    
    bot.answerCallbackQuery(query.id, { text: '✅ Заявка подтверждена!' });
  }
  
  // Перезвонить
  if (data.startsWith('call_')) {
    const leadId = data.replace('call_', '');
    const lead = leads.get(leadId);
    
    bot.answerCallbackQuery(query.id, { 
      text: lead ? `📞 Позвоните: ${lead.phone}` : '📞 Контакт недоступен',
      show_alert: true 
    });
  }
  
  // Напоминание через 30 минут
  if (data.startsWith('remind_30_')) {
    const leadId = data.replace('remind_30_', '');
    
    bot.answerCallbackQuery(query.id, { text: '⏰ Напоминание установлено на 30 минут' });
    
    setTimeout(() => {
      const lead = leads.get(leadId);
      if (lead && lead.status !== 'confirmed') {
        bot.sendMessage(chatId, `
⏰ <b>НАПОМИНАНИЕ</b>

Заявка ещё не обработана!

👤 ${lead.name}
📞 ${lead.phone}
🏥 ${lead.service}

⚠️ Клиент ждёт ответа!
        `, {
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
      }
    }, 30 * 60 * 1000); // 30 minutes
  }
  
  // Отклонить
  if (data.startsWith('reject_')) {
    const leadId = data.replace('reject_', '');
    const lead = leads.get(leadId);
    if (lead) lead.status = 'rejected';
    
    bot.editMessageText(
      query.message.text + '\n\n❌ <b>ОТКЛОНЕНО</b>',
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML'
      }
    );
    
    bot.answerCallbackQuery(query.id, { text: '❌ Заявка отклонена' });
  }
});

// ===== ФУНКЦИЯ: НОВАЯ ЗАЯВКА (вызывается из webhook) =====
function processNewLead(data) {
  const leadId = Date.now().toString();
  const lead = {
    id: leadId,
    ...data,
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('ru-RU'),
    status: 'new'
  };
  
  leads.set(leadId, lead);
  
  const isHot = lead.leadType === 'hot';
  const emoji = isHot ? '🔥🔥🔥' : lead.leadType === 'warm' ? '🟡' : '📋';
  
  const message = `
${emoji} <b>${isHot ? 'ГОРЯЧАЯ ЗАЯВКА!' : 'Новая заявка'}</b>

👤 <b>${lead.name}</b>
📞 ${lead.phone}
🏥 ${lead.service || 'Не выбрана'}
📅 ${lead.preferredDate || 'Не указана'} в ${lead.preferredTime || 'не указано'}
💬 ${lead.comment || '—'}

💰 Ожидаемый чек: <b>${lead.estimatedValue}</b>
📊 Источник: ${lead.source === 'quiz' ? 'Квиз' : 'Форма записи'}

📅 Заявка от: ${new Date().toLocaleString('ru-RU')}
${isHot ? '\n⚠️ <b>ПЕРЕЗВОНИТЕ В ТЕЧЕНИЕ 5 МИНУТ!</b>' : ''}
  `;
  
  bot.sendMessage(CONFIG.OWNER_CHAT_ID, message, {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📞 Перезвонить', callback_data: `call_${leadId}` },
          { text: '✅ Подтвердить', callback_data: `confirm_${leadId}` }
        ],
        [
          { text: '⏰ Напомнить через 30 мин', callback_data: `remind_30_${leadId}` },
          { text: '❌ Отклонить', callback_data: `reject_${leadId}` }
        ]
      ]
    }
  });
  
  return leadId;
}

// ===== EXPRESS WEBHOOK (для приёма заявок с сайта) =====
// Раскомментируйте, если хотите принимать webhook напрямую

/*
const express = require('express');
const app = express();
app.use(express.json());

app.post('/webhook', (req, res) => {
  const data = req.body;
  const leadId = processNewLead(data);
  res.json({ success: true, leadId });
});

app.listen(3000, () => {
  console.log('🌐 Webhook server running on port 3000');
});
*/

module.exports = { processNewLead };
