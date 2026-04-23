/* ============================================
   SCRIPT.JS — Smile Clinic Main Logic
   Navigation, animations, forms, phone mask
   ============================================ */

// ===== TELEGRAM CONFIG =====
const TG_TOKEN = '8610936017:AAGIMKWUoiJpmOPNwwwEultmncx7buC99Fc';
const TG_CHAT_ID = '5741885046';
const TG_API = `https://api.telegram.org/bot${TG_TOKEN}/sendMessage`;

document.addEventListener('DOMContentLoaded', () => {
  // Initialize all modules
  initNavbar();
  initScrollAnimations();
  initScrollTop();
  initBookingForm();
  initPhoneMask();
  initDateDefaults();
  QuizModule.init();
});

/* ===== NAVBAR ===== */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  const toggle = document.getElementById('navToggle');
  const menu = document.getElementById('navMenu');

  // Scroll effect
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  });

  // Mobile toggle
  toggle.addEventListener('click', () => {
    toggle.classList.toggle('active');
    menu.classList.toggle('active');
    document.body.style.overflow = menu.classList.contains('active') ? 'hidden' : '';
  });

  // Close menu on link click
  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      toggle.classList.remove('active');
      menu.classList.remove('active');
      document.body.style.overflow = '';
    });
  });

  // Active link highlight on scroll
  const sections = document.querySelectorAll('section[id]');
  window.addEventListener('scroll', () => {
    const scrollPos = window.scrollY + 100;
    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');
      const link = menu.querySelector(`a[href="#${id}"]`);
      if (link) {
        link.classList.toggle('active', scrollPos >= top && scrollPos < top + height);
      }
    });
  });
}

/* ===== SCROLL ANIMATIONS (Intersection Observer) ===== */
function initScrollAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // Don't unobserve to allow re-triggering is optional
        // observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Observe all reveal elements
  document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(el => {
    observer.observe(el);
  });
}

/* ===== SCROLL TO TOP ===== */
function initScrollTop() {
  const btn = document.getElementById('scrollTop');
  
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 500);
  });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ===== PHONE MASK ===== */
function initPhoneMask() {
  const phoneInput = document.getElementById('bookingPhone');
  if (!phoneInput) return;

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
  });
  
  phoneInput.addEventListener('focus', (e) => {
    if (!e.target.value) e.target.value = '+7 (';
  });

  phoneInput.addEventListener('blur', (e) => {
    if (e.target.value === '+7 (' || e.target.value === '+7') {
      e.target.value = '';
    }
  });
}

/* ===== DATE DEFAULTS ===== */
function initDateDefaults() {
  const dateInput = document.getElementById('bookingDate');
  if (!dateInput) return;
  
  // Set min date to today
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  dateInput.min = `${yyyy}-${mm}-${dd}`;
  
  // Set default to tomorrow
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tmYYYY = tomorrow.getFullYear();
  const tmMM = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const tmDD = String(tomorrow.getDate()).padStart(2, '0');
  dateInput.value = `${tmYYYY}-${tmMM}-${tmDD}`;
}

/* ===== BOOKING FORM ===== */
function initBookingForm() {
  const form = document.getElementById('bookingForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Validate
    const name = document.getElementById('bookingName').value.trim();
    const phone = document.getElementById('bookingPhone').value.trim();
    
    if (name.length < 2) {
      shakeElement(document.getElementById('bookingName'));
      return;
    }
    
    if (phone.replace(/\D/g, '').length < 11) {
      shakeElement(document.getElementById('bookingPhone'));
      return;
    }
    
    // Gather data
    const formData = {
      source: 'booking_form',
      name: name,
      phone: phone,
      service: document.getElementById('bookingService').value,
      date: document.getElementById('bookingDate').value,
      time: document.getElementById('bookingTime').value,
      comment: document.getElementById('bookingComment').value.trim(),
      timestamp: new Date().toISOString(),
      // Check if quiz was completed and add that data
      quizCompleted: !!window.quizData,
      quizData: window.quizData || null
    };
    
    // Classify lead
    formData.leadType = classifyLead(formData);
    formData.estimatedValue = estimateValue(formData.service);
    
    // Show loading
    const submitBtn = document.getElementById('bookingSubmit');
    const originalText = submitBtn.textContent;
    submitBtn.innerHTML = '<span class="spinner"></span> Отправляем...';
    submitBtn.disabled = true;
    
    // Send to Telegram
    const message = formatBookingTelegram(formData);
    
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
    .then(data => {
      console.log('✅ Telegram response:', data);
      
      if (data.ok) {
        // Show success
        form.style.display = 'none';
        document.getElementById('bookingSuccess').classList.add('active');
        openModal();
      } else {
        alert('Ошибка отправки. Позвоните нам: +7 (495) 123-45-67');
        console.error('Telegram error:', data);
      }
      
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    })
    .catch(err => {
      console.error('❌ Network error:', err);
      // Still show success to user, log error
      form.style.display = 'none';
      document.getElementById('bookingSuccess').classList.add('active');
      openModal();
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    });
  });
}

/* ===== LEAD CLASSIFICATION ===== */
function classifyLead(data) {
  const hotServices = ['implant', 'prosthetics', 'orthodontics'];
  const warmServices = ['treatment', 'whitening'];
  
  if (hotServices.includes(data.service)) return 'hot';
  if (warmServices.includes(data.service)) return 'warm';
  return 'standard';
}

function estimateValue(service) {
  const values = {
    'implant': '35 000 – 150 000 ₽',
    'treatment': '4 500 – 20 000 ₽',
    'hygiene': '5 500 – 8 000 ₽',
    'whitening': '15 000 – 25 000 ₽',
    'prosthetics': '20 000 – 200 000 ₽',
    'orthodontics': '80 000 – 300 000 ₽',
    'consultation': 'Бесплатно (потенциал 10 000+ ₽)'
  };
  return values[service] || 'Не определён';
}

/* ===== TELEGRAM MESSAGE FORMAT ===== */
function formatBookingTelegram(data) {
  const leadEmoji = data.leadType === 'hot' ? '🔥🔥🔥' : data.leadType === 'warm' ? '🟡' : '📋';
  const serviceName = getServiceDisplayName(data.service);
  
  // Use HTML formatting for Telegram
  let msg = `${leadEmoji} <b>${data.leadType === 'hot' ? 'ГОРЯЧАЯ ЗАЯВКА!' : 'Новая заявка'}</b> (Форма записи)\n\n`;
  msg += `👤 <b>Имя:</b> ${escapeHtml(data.name)}\n`;
  msg += `📞 <b>Телефон:</b> ${escapeHtml(data.phone)}\n`;
  msg += `🏥 <b>Услуга:</b> ${serviceName}\n`;
  msg += `📅 <b>Дата:</b> ${data.date || 'не указана'}\n`;
  msg += `⏰ <b>Время:</b> ${data.time || 'не указано'}\n`;
  if (data.comment) msg += `💬 <b>Комментарий:</b> ${escapeHtml(data.comment)}\n`;
  msg += `\n💰 <b>Ожидаемый чек:</b> ${data.estimatedValue}\n`;
  msg += `🧠 Квиз пройден: ${data.quizCompleted ? 'Да' : 'Нет'}\n`;
  msg += `\n📅 ${new Date().toLocaleString('ru-RU')}\n`;
  if (data.leadType === 'hot') msg += `\n⚠️ <b>ПЕРЕЗВОНИТЕ В ТЕЧЕНИЕ 5 МИНУТ!</b>`;
  else msg += `\nСвяжитесь в течение 15 минут.`;
  
  return msg;
}

function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function getServiceDisplayName(service) {
  const names = {
    'implant': '🦷 Имплантация',
    'treatment': '💊 Лечение зубов',
    'hygiene': '✨ Гигиена полости рта',
    'whitening': '💎 Отбеливание',
    'prosthetics': '👑 Протезирование',
    'orthodontics': '😁 Ортодонтия',
    'consultation': '📋 Бесплатная консультация'
  };
  return names[service] || service || 'Не выбрана';
}

/* ===== WEBHOOK SENDER ===== */
async function sendToWebhook(data) {
  // Replace with your actual Make (Integromat) webhook URL
  const WEBHOOK_URL = 'https://hook.eu1.make.com/YOUR_WEBHOOK_ID';
  
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) throw new Error('Webhook error');
    console.log('✅ Data sent to webhook successfully');
  } catch (error) {
    console.error('❌ Webhook error:', error);
    // Fallback: save to localStorage
    const queue = JSON.parse(localStorage.getItem('pendingLeads') || '[]');
    queue.push(data);
    localStorage.setItem('pendingLeads', JSON.stringify(queue));
    console.log('💾 Saved to local queue for retry');
  }
}

/* ===== MODAL ===== */
function openModal() {
  document.getElementById('successModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('successModal').classList.remove('active');
  document.body.style.overflow = '';
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.id === 'successModal') closeModal();
});

document.getElementById('modalClose')?.addEventListener('click', closeModal);

// Close modal on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

/* ===== FORM HELPERS ===== */
function resetBookingForm() {
  const form = document.getElementById('bookingForm');
  form.reset();
  form.style.display = 'block';
  document.getElementById('bookingSuccess').classList.remove('active');
  initDateDefaults();
}

function prefillBooking() {
  if (window.quizData) {
    const nameInput = document.getElementById('bookingName');
    const phoneInput = document.getElementById('bookingPhone');
    const serviceSelect = document.getElementById('bookingService');
    
    if (nameInput && window.quizData.name) nameInput.value = window.quizData.name;
    if (phoneInput && window.quizData.phone) phoneInput.value = window.quizData.phone;
    if (serviceSelect && window.quizData.recommendation) {
      serviceSelect.value = window.quizData.recommendation.service;
    }
  }
}

/* ===== UI HELPERS ===== */
function shakeElement(el) {
  el.style.animation = 'none';
  el.offsetHeight; // trigger reflow
  el.style.animation = 'shake 0.5s ease';
  el.style.borderColor = 'var(--danger)';
  
  setTimeout(() => {
    el.style.borderColor = '';
    el.style.animation = '';
  }, 2000);
}

// Add shake animation dynamically
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
    20%, 40%, 60%, 80% { transform: translateX(4px); }
  }
`;
document.head.appendChild(shakeStyle);

/* ===== SMOOTH SCROLL FOR ALL ANCHOR LINKS ===== */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    if (href === '#') return;
    
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      const offset = 80; // navbar height
      const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

/* ===== COUNTER ANIMATION ===== */
function animateCounters() {
  document.querySelectorAll('.hero-stat .number').forEach(counter => {
    const text = counter.textContent;
    const numMatch = text.match(/(\d+)/);
    if (!numMatch) return;
    
    const target = parseInt(numMatch[1]);
    const suffix = text.replace(numMatch[1], '');
    let current = 0;
    const duration = 2000;
    const step = target / (duration / 16);
    
    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      counter.textContent = Math.floor(current) + suffix;
    }, 16);
  });
}

// Trigger counter animation when hero is visible
const heroObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCounters();
      heroObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.3 });

const heroStats = document.querySelector('.hero-stats');
if (heroStats) heroObserver.observe(heroStats);
