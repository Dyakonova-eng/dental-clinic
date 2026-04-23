/* ============================================
   QUIZ MODULE — Smile Clinic
   Interactive 5-step treatment finder
   ============================================ */

const QuizModule = (() => {
  // Quiz data
  const questions = [
    {
      id: 'concern',
      question: 'Что вас беспокоит больше всего?',
      options: [
        { value: 'pain', icon: '😣', title: 'Боль или дискомфорт', desc: 'Болит зуб, десна или челюсть' },
        { value: 'aesthetics', icon: '😬', title: 'Эстетика улыбки', desc: 'Хочу красивые, ровные, белые зубы' },
        { value: 'prevention', icon: '🛡️', title: 'Профилактика', desc: 'Хочу сохранить здоровье зубов' },
        { value: 'restoration', icon: '🦷', title: 'Восстановление зубов', desc: 'Отсутствуют один или несколько зубов' }
      ]
    },
    {
      id: 'lastVisit',
      question: 'Когда вы последний раз были у стоматолога?',
      options: [
        { value: 'recent', icon: '✅', title: 'Менее 6 месяцев назад', desc: 'Слежу за здоровьем зубов' },
        { value: 'moderate', icon: '📅', title: '6–12 месяцев назад', desc: 'Нужно бы сходить...' },
        { value: 'long', icon: '⏳', title: '1–3 года назад', desc: 'Давно откладываю визит' },
        { value: 'veryLong', icon: '😰', title: 'Более 3 лет', desc: 'Не помню, когда был последний раз' }
      ]
    },
    {
      id: 'priority',
      question: 'Что для вас важнее всего при выборе клиники?',
      options: [
        { value: 'price', icon: '💰', title: 'Доступная цена', desc: 'Хочу качественно, но без переплат' },
        { value: 'quality', icon: '⭐', title: 'Высокое качество', desc: 'Готов заплатить за лучший результат' },
        { value: 'speed', icon: '⚡', title: 'Быстрый результат', desc: 'Нет времени на долгое лечение' },
        { value: 'painless', icon: '💆', title: 'Безболезненность', desc: 'Боюсь боли, нужна максимальная анестезия' }
      ]
    },
    {
      id: 'budget',
      question: 'Какой бюджет вы рассматриваете?',
      options: [
        { value: 'low', icon: '💵', title: 'До 10 000 ₽', desc: 'Базовое лечение или профилактика' },
        { value: 'medium', icon: '💳', title: '10 000 – 50 000 ₽', desc: 'Лечение или комплексная гигиена' },
        { value: 'high', icon: '💎', title: '50 000 – 150 000 ₽', desc: 'Имплантация или протезирование' },
        { value: 'premium', icon: '👑', title: 'Более 150 000 ₽', desc: 'Полная реставрация или All-on-4' }
      ]
    },
    {
      id: 'contact',
      question: 'Отлично! Оставьте контакты для персональной рекомендации',
      isContactStep: true
    }
  ];

  // Treatment recommendations based on answers
  const recommendations = {
    pain: {
      title: '🩺 Рекомендация: Лечение зубов',
      text: 'На основе ваших ответов, мы рекомендуем начать с диагностики и лечения. Не терпите боль — чем раньше обратитесь, тем проще и дешевле лечение.',
      service: 'treatment',
      urgency: 'high'
    },
    aesthetics: {
      title: '✨ Рекомендация: Эстетическая стоматология',
      text: 'Для красивой улыбки мы подберём оптимальное решение: от профессионального отбеливания до виниров. Результат за 1–3 визита.',
      service: 'whitening',
      urgency: 'medium'
    },
    prevention: {
      title: '🛡️ Рекомендация: Профессиональная гигиена',
      text: 'Отличный выбор! Профессиональная чистка раз в 6 месяцев — лучший способ сохранить зубы здоровыми и избежать дорогого лечения.',
      service: 'hygiene',
      urgency: 'low'
    },
    restoration: {
      title: '🦷 Рекомендация: Имплантация',
      text: 'Для восстановления отсутствующих зубов имплантация — наиболее надёжное и долговечное решение. Приживаемость 99.2%, гарантия 5 лет.',
      service: 'implant',
      urgency: 'high'
    }
  };

  let currentStep = 0;
  let answers = {};

  // Initialize quiz
  function init() {
    renderStep(0);
    setupNavigation();
  }

  // Render a quiz step
  function renderStep(step) {
    const content = document.getElementById('quizContent');
    const question = questions[step];
    
    if (question.isContactStep) {
      content.innerHTML = renderContactStep();
      setupContactValidation();
    } else {
      content.innerHTML = renderQuestionStep(question);
      setupOptionListeners(question);
    }
    
    updateProgress(step);
    updateNavigation(step);
  }

  function renderQuestionStep(question) {
    return `
      <div class="quiz-step-counter">Шаг ${currentStep + 1} из ${questions.length}</div>
      <h3 class="quiz-question">${question.question}</h3>
      <div class="quiz-options">
        ${question.options.map(opt => `
          <div class="quiz-option ${answers[question.id] === opt.value ? 'selected' : ''}" data-value="${opt.value}">
            <div class="quiz-option-icon">${opt.icon}</div>
            <div class="quiz-option-text">
              <div class="title">${opt.title}</div>
              <div class="desc">${opt.desc}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderContactStep() {
    return `
      <div class="quiz-step-counter">Шаг ${currentStep + 1} из ${questions.length}</div>
      <h3 class="quiz-question">Почти готово! Оставьте контакты</h3>
      <p style="color:var(--text-secondary);margin-bottom:24px;font-size:0.95rem;">
        Мы подготовим для вас персональный план лечения и свяжемся в течение 15 минут
      </p>
      <div class="form-group">
        <label for="quizName">Ваше имя *</label>
        <input type="text" id="quizName" placeholder="Как вас зовут?" value="${answers.name || ''}" required>
      </div>
      <div class="form-group">
        <label for="quizPhone">Телефон *</label>
        <input type="tel" id="quizPhone" placeholder="+7 (___) ___-__-__" value="${answers.phone || ''}" required>
      </div>
      <div class="form-group">
        <label for="quizTime">Удобное время для звонка</label>
        <select id="quizTime">
          <option value="any">В любое время</option>
          <option value="morning">Утро (9:00 – 12:00)</option>
          <option value="afternoon">День (12:00 – 17:00)</option>
          <option value="evening">Вечер (17:00 – 21:00)</option>
        </select>
      </div>
    `;
  }

  function setupOptionListeners(question) {
    document.querySelectorAll('.quiz-option').forEach(option => {
      option.addEventListener('click', () => {
        // Remove previous selection
        document.querySelectorAll('.quiz-option').forEach(o => o.classList.remove('selected'));
        // Select current
        option.classList.add('selected');
        // Save answer
        answers[question.id] = option.dataset.value;
        // Enable next button
        document.getElementById('quizNext').disabled = false;
        
        // Auto-advance after 400ms
        setTimeout(() => {
          if (currentStep < questions.length - 1) {
            currentStep++;
            renderStep(currentStep);
          }
        }, 400);
      });
    });
  }

  function setupContactValidation() {
    const nameInput = document.getElementById('quizName');
    const phoneInput = document.getElementById('quizPhone');
    const nextBtn = document.getElementById('quizNext');
    
    nextBtn.textContent = 'Получить рекомендацию ✨';
    
    const validate = () => {
      const nameValid = nameInput.value.trim().length >= 2;
      const phoneValid = phoneInput.value.trim().length >= 10;
      nextBtn.disabled = !(nameValid && phoneValid);
      answers.name = nameInput.value.trim();
      answers.phone = phoneInput.value.trim();
    };
    
    nameInput.addEventListener('input', validate);
    phoneInput.addEventListener('input', validate);
    
    // Phone mask
    phoneInput.addEventListener('input', (e) => {
      let val = e.target.value.replace(/\D/g, '');
      if (val.length > 0) {
        if (val[0] === '8') val = '7' + val.slice(1);
        if (val[0] !== '7') val = '7' + val;
        let formatted = '+7';
        if (val.length > 1) formatted += ' (' + val.slice(1, 4);
        if (val.length > 4) formatted += ') ' + val.slice(4, 7);
        if (val.length > 7) formatted += '-' + val.slice(7, 9);
        if (val.length > 9) formatted += '-' + val.slice(9, 11);
        e.target.value = formatted;
      }
      validate();
    });
    
    validate();
  }

  function updateProgress(step) {
    const steps = document.querySelectorAll('.quiz-progress-step');
    steps.forEach((s, i) => {
      s.classList.remove('active', 'completed');
      if (i < step) s.classList.add('completed');
      if (i === step) s.classList.add('active');
    });
  }

  function updateNavigation(step) {
    const prevBtn = document.getElementById('quizPrev');
    const nextBtn = document.getElementById('quizNext');
    
    prevBtn.style.visibility = step === 0 ? 'hidden' : 'visible';
    
    if (step === questions.length - 1) {
      nextBtn.textContent = 'Получить рекомендацию ✨';
    } else {
      nextBtn.textContent = 'Далее →';
    }
    
    // Check if current step has an answer
    const question = questions[step];
    if (question.isContactStep) {
      const name = answers.name || '';
      const phone = answers.phone || '';
      nextBtn.disabled = !(name.length >= 2 && phone.length >= 10);
    } else {
      nextBtn.disabled = !answers[question.id];
    }
  }

  function setupNavigation() {
    document.getElementById('quizPrev').addEventListener('click', () => {
      if (currentStep > 0) {
        currentStep--;
        renderStep(currentStep);
      }
    });
    
    document.getElementById('quizNext').addEventListener('click', () => {
      if (currentStep < questions.length - 1) {
        currentStep++;
        renderStep(currentStep);
      } else {
        // Submit quiz
        showResult();
      }
    });
  }

  function showResult() {
    const concern = answers.concern || 'prevention';
    const rec = recommendations[concern];
    const quizTime = document.getElementById('quizTime');
    answers.preferredTime = quizTime ? quizTime.value : 'any';
    
    // Hide quiz content and nav
    document.getElementById('quizContent').style.display = 'none';
    document.getElementById('quizNav').style.display = 'none';
    document.getElementById('quizProgress').style.display = 'none';
    
    // Show result
    const result = document.getElementById('quizResult');
    result.classList.add('active');
    
    document.getElementById('quizResultText').textContent = rec.text;
    document.getElementById('quizResultDetails').innerHTML = `
      <div class="glass-card" style="padding:20px;margin-top:16px;">
        <h4 style="margin-bottom:8px;">${rec.title}</h4>
        <p style="font-size:0.9rem;margin-bottom:12px;">${rec.text}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <span class="ba-tag">Рекомендованная услуга: ${getServiceName(rec.service)}</span>
          <span class="ba-tag" style="background:rgba(45,212,191,0.15);color:var(--teal);">Приоритет: ${getUrgencyLabel(rec.urgency)}</span>
        </div>
      </div>
    `;
    
    // Store quiz data for form prefill
    window.quizData = {
      ...answers,
      recommendation: rec,
      completedAt: new Date().toISOString()
    };
    
    // Send quiz data via webhook
    sendQuizData(answers, rec);
  }

  function getServiceName(service) {
    const names = {
      'implant': 'Имплантация',
      'treatment': 'Лечение',
      'hygiene': 'Гигиена',
      'whitening': 'Эстетика',
      'prosthetics': 'Протезирование'
    };
    return names[service] || service;
  }

  function getUrgencyLabel(urgency) {
    const labels = {
      'high': '🔴 Высокий — запишитесь сегодня',
      'medium': '🟡 Средний — запишитесь на неделе',
      'low': '🟢 Плановый — запишитесь удобно'
    };
    return labels[urgency] || urgency;
  }

  function sendQuizData(answers, rec) {
    // Prepare data
    const data = {
      source: 'quiz',
      name: answers.name,
      phone: answers.phone,
      concern: answers.concern,
      lastVisit: answers.lastVisit,
      priority: answers.priority,
      budget: answers.budget,
      preferredTime: answers.preferredTime,
      recommendation: rec.service,
      urgency: rec.urgency,
      timestamp: new Date().toISOString()
    };
    
    // Classify lead
    const isHotLead = ['implant', 'prosthetics'].includes(rec.service) || 
                      answers.budget === 'premium' || 
                      answers.budget === 'high';
    data.leadType = isHotLead ? 'hot' : 'warm';
    data.estimatedValue = getEstimatedValue(answers.budget);
    
    // Build Telegram message
    const message = formatTelegramMessage(data);
    
    // Send to Telegram (uses globals from script.js)
    fetch(TG_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TG_CHAT_ID,
        text: message,
        parse_mode: 'HTML'
      })
    })
    .then(res => res.json())
    .then(result => {
      console.log('✅ Quiz Telegram response:', result);
      if (!result.ok) console.error('Telegram quiz error:', result);
    })
    .catch(err => console.error('❌ Quiz send error:', err));
  }

  function getEstimatedValue(budget) {
    const values = {
      'low': '5 000 – 10 000 ₽',
      'medium': '10 000 – 50 000 ₽',
      'high': '50 000 – 150 000 ₽',
      'premium': '150 000+ ₽'
    };
    return values[budget] || 'не указан';
  }

  function getConcernLabel(concern) {
    const labels = { 'pain': 'Боль', 'aesthetics': 'Эстетика', 'prevention': 'Профилактика', 'restoration': 'Восстановление' };
    return labels[concern] || concern;
  }

  function getLastVisitLabel(v) {
    const labels = { 'recent': 'Менее 6 мес', 'moderate': '6-12 мес', 'long': '1-3 года', 'veryLong': 'Более 3 лет' };
    return labels[v] || v;
  }

  function getPriorityLabel(p) {
    const labels = { 'price': 'Цена', 'quality': 'Качество', 'speed': 'Скорость', 'painless': 'Безболезненность' };
    return labels[p] || p;
  }

  function getTimeLabel(t) {
    const labels = { 'any': 'В любое время', 'morning': 'Утро', 'afternoon': 'День', 'evening': 'Вечер' };
    return labels[t] || t;
  }

  function formatTelegramMessage(data) {
    const isHot = data.leadType === 'hot';
    const esc = (t) => t ? t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : '';
    
    let msg = `${isHot ? '🔥🔥🔥' : '🧠'} <b>${isHot ? 'ГОРЯЧАЯ ЗАЯВКА' : 'Новая заявка'}</b> (Квиз)\n\n`;
    msg += `👤 <b>Имя:</b> ${esc(data.name)}\n`;
    msg += `📞 <b>Телефон:</b> ${esc(data.phone)}\n\n`;
    msg += `🎯 <b>Беспокоит:</b> ${getConcernLabel(data.concern)}\n`;
    msg += `🏥 <b>Последний визит:</b> ${getLastVisitLabel(data.lastVisit)}\n`;
    msg += `⭐ <b>Приоритет:</b> ${getPriorityLabel(data.priority)}\n`;
    msg += `💰 <b>Бюджет:</b> ${data.estimatedValue}\n`;
    msg += `⏰ <b>Удобное время:</b> ${getTimeLabel(data.preferredTime)}\n\n`;
    msg += `📊 <b>Рекомендация:</b> ${getServiceName(data.recommendation)}\n`;
    msg += `💵 <b>Ожидаемый чек:</b> ${data.estimatedValue}\n\n`;
    msg += `📅 ${new Date().toLocaleString('ru-RU')}`;
    if (isHot) msg += `\n\n⚠️ <b>ПЕРЕЗВОНИТЕ В ТЕЧЕНИЕ 5 МИНУТ!</b>`;
    
    return msg;
  }

  function reset() {
    currentStep = 0;
    answers = {};
    document.getElementById('quizContent').style.display = 'block';
    document.getElementById('quizNav').style.display = 'flex';
    document.getElementById('quizProgress').style.display = 'flex';
    document.getElementById('quizResult').classList.remove('active');
    renderStep(0);
  }

  function getAnswers() {
    return answers;
  }

  return { init, reset, getAnswers };
})();
