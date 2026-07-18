/**
 * Hacettepe AI Club - Admin Panel Module
 * Handles login, calendar event management, training management,
 * and admin-mode UI toggling. All data persisted in localStorage.
 */

// ---------------------------------------------------------------------------
//  Constants & Storage Keys
// ---------------------------------------------------------------------------
const ADMIN_PASSWORD       = 'hacettepeai2026';
const LS_ADMIN_STATE       = 'hacettepe_ai_admin';
const LS_EVENTS_KEY        = 'hacettepe_ai_events';
const LS_TRAININGS_KEY     = 'hacettepe_ai_trainings';

const EVENT_TYPES = {
  egitim:   'Eğitim',
  yarisma:  'Yarışma',
  etkinlik: 'Etkinlik',
  party:    'Party',
};

// ---------------------------------------------------------------------------
//  DOM References
// ---------------------------------------------------------------------------
const adminModal     = document.getElementById('admin-modal');
const adminLoginForm = document.getElementById('admin-login-form');
const adminClose     = document.getElementById('admin-close');
const adminTrigger   = document.getElementById('admin-trigger');
const adminPassword  = document.getElementById('admin-password');

// ---------------------------------------------------------------------------
//  Admin Login Modal
// ---------------------------------------------------------------------------

/** Opens the admin login modal. */
function openAdminModal() {
  adminModal?.classList.add('active');
  document.body.classList.add('modal-open');
  adminPassword?.focus();
}

/** Closes the admin login modal. */
function closeAdminModal() {
  adminModal?.classList.remove('active');
  adminModal?.classList.add('closing');

  const onEnd = () => {
    adminModal?.classList.remove('closing');
    document.body.classList.remove('modal-open');
    adminModal?.removeEventListener('transitionend', onEnd);
  };
  adminModal?.addEventListener('transitionend', onEnd);

  setTimeout(() => {
    adminModal?.classList.remove('closing');
    document.body.classList.remove('modal-open');
  }, 500);
}

adminTrigger?.addEventListener('click', (e) => {
  e.preventDefault();
  openAdminModal();
});

adminClose?.addEventListener('click', closeAdminModal);

adminModal?.addEventListener('click', (e) => {
  if (e.target === adminModal) closeAdminModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && adminModal?.classList.contains('active')) {
    closeAdminModal();
  }
});

// ---------------------------------------------------------------------------
//  Authentication
// ---------------------------------------------------------------------------

/**
 * Validates the entered password and activates admin mode on success.
 * @param {SubmitEvent} e
 */
function handleAdminLogin(e) {
  e.preventDefault();

  const entered = adminPassword?.value ?? '';

  if (entered === ADMIN_PASSWORD) {
    activateAdminMode();
    closeAdminModal();
    adminLoginForm?.reset();
  } else {
    alert('Yanlış şifre. Lütfen tekrar deneyin.');
    adminPassword?.focus();
  }
}

adminLoginForm?.addEventListener('submit', handleAdminLogin);

/** Enables admin mode: toolbar, body class, localStorage flag. */
function activateAdminMode() {
  document.body.classList.add('admin-mode');
  localStorage.setItem(LS_ADMIN_STATE, 'true');
  createAdminToolbar();
  injectAdminButtons();
  renderCalendarEvents();
  renderTrainings();
}

/** Disables admin mode and cleans up. */
function deactivateAdminMode() {
  document.body.classList.remove('admin-mode');
  localStorage.removeItem(LS_ADMIN_STATE);
  removeAdminToolbar();
  removeAdminButtons();
  renderCalendarEvents();
  renderTrainings();
}

// ---------------------------------------------------------------------------
//  Admin Toolbar
// ---------------------------------------------------------------------------

/** Creates and inserts a fixed admin toolbar at the top of the page. */
function createAdminToolbar() {
  if (document.getElementById('admin-toolbar')) return;

  const toolbar = document.createElement('div');
  toolbar.id = 'admin-toolbar';
  toolbar.innerHTML = `
    <span class="admin-toolbar__label">🔒 Admin Modu Aktif</span>
    <button id="admin-logout-btn" class="admin-toolbar__btn">Çıkış Yap</button>
  `;
  document.body.prepend(toolbar);

  document.getElementById('admin-logout-btn')
    ?.addEventListener('click', deactivateAdminMode);
}

/** Removes the admin toolbar from the DOM. */
function removeAdminToolbar() {
  document.getElementById('admin-toolbar')?.remove();
}

// ---------------------------------------------------------------------------
//  Admin Action Buttons (injected into page sections)
// ---------------------------------------------------------------------------

/** Injects "Add" buttons into the calendar and training sections. */
function injectAdminButtons() {
  // Calendar section
  const calendarSection = document.querySelector('#calendar, .calendar-section, [data-section="calendar"]');
  if (calendarSection && !calendarSection.querySelector('.admin-add-event-btn')) {
    const btn = document.createElement('button');
    btn.className = 'admin-add-event-btn admin-btn';
    btn.textContent = '+ Etkinlik Ekle';
    btn.addEventListener('click', openEventForm);
    calendarSection.appendChild(btn);
  }

  // Training / Education section
  const trainingSection = document.querySelector('#trainings, #education, .education-section, [data-section="education"]');
  if (trainingSection && !trainingSection.querySelector('.admin-add-training-btn')) {
    const btn = document.createElement('button');
    btn.className = 'admin-add-training-btn admin-btn';
    btn.textContent = '+ Eğitim Ekle';
    btn.addEventListener('click', openTrainingForm);
    trainingSection.appendChild(btn);
  }
}

/** Removes injected admin buttons. */
function removeAdminButtons() {
  document.querySelectorAll('.admin-btn').forEach((btn) => btn.remove());
  // Also remove any open inline forms
  document.querySelectorAll('.admin-inline-form').forEach((f) => f.remove());
}

// ---------------------------------------------------------------------------
//  Calendar Event Management
// ---------------------------------------------------------------------------

/**
 * Reads calendar events from localStorage.
 * @returns {Array<{name: string, date: string, location: string, type: string}>}
 */
function getCalendarEvents() {
  try {
    return JSON.parse(localStorage.getItem(LS_EVENTS_KEY)) || [];
  } catch {
    return [];
  }
}

/**
 * Saves events array to localStorage.
 * @param {Array} events
 */
function saveCalendarEvents(events) {
  localStorage.setItem(LS_EVENTS_KEY, JSON.stringify(events));
}

/**
 * Adds a single calendar event and re-renders.
 * @param {{ name: string, date: string, location: string, type: string }} event
 */
function addCalendarEvent(event) {
  const events = getCalendarEvents();
  events.push(event);
  saveCalendarEvents(events);
  renderCalendarEvents();
}

/**
 * Deletes a calendar event by index and re-renders.
 * @param {number} index
 */
function deleteCalendarEvent(index) {
  const events = getCalendarEvents();
  events.splice(index, 1);
  saveCalendarEvents(events);
  renderCalendarEvents();
}

/**
 * Parses a Turkish date string (e.g., "15 Aralık 2026") or YYYY-MM-DD format
 * to retrieve a structured day/month/year block for the calendar generator.
 * @param {string} dateStr
 * @returns {{year: string, month: string, day: string}}
 */
function parseTurkishDate(dateStr) {
  const months = {
    'ocak': '01', 'şubat': '02', 'mart': '03', 'nisan': '04',
    'mayıs': '05', 'haziran': '06', 'temmuz': '07', 'ağustos': '08',
    'eylül': '09', 'ekim': '10', 'kasım': '11', 'aralık': '12'
  };

  const cleanStr = dateStr.toLowerCase().trim();
  const parts = cleanStr.split(/\s+/);

  let day = '01';
  let month = '01';
  let year = new Date().getFullYear().toString();

  if (parts.length >= 3) {
    day = parts[0].padStart(2, '0');
    const mStr = parts[1];
    month = months[mStr] || '01';
    year = parts[2];
  } else if (parts.length === 2) {
    const mStr = parts[0];
    month = months[mStr] || '01';
    year = parts[1];
  } else {
    // If it's YYYY-MM-DD from HTML input
    const match = cleanStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      return { year: match[1], month: match[2], day: match[3] };
    }
  }

  return { year, month, day };
}

/**
 * Creates a Google Calendar action template URL for rendering.
 * @param {string} name
 * @param {string} dateStr
 * @param {string} location
 * @returns {string}
 */
function getGoogleCalendarUrl(name, dateStr, location) {
  const parsed = parseTurkishDate(dateStr);
  const startDate = `${parsed.year}${parsed.month}${parsed.day}`;
  // 19:00 to 21:00 Turkey time (GMT+3) -> 16:00 to 18:00 UTC
  const dates = `${startDate}T160000Z/${startDate}T180000Z`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(name)}&dates=${dates}&details=${encodeURIComponent(name + ' - Hacettepe AI Club')}&location=${encodeURIComponent(location)}`;
}

/** Renders all calendar events into #calendar-body as table rows. */
function renderCalendarEvents() {
  const tbody = document.getElementById('calendar-body');
  if (!tbody) return;

  const events  = getCalendarEvents();
  const isAdmin = document.body.classList.contains('admin-mode');

  // Clear only dynamic rows (keep any static ones if desired)
  tbody.querySelectorAll('.dynamic-event-row').forEach((row) => row.remove());

  events.forEach((evt, i) => {
    const tr = document.createElement('tr');
    tr.className = 'dynamic-event-row';

    // Map evt.type to custom badge styling classes
    let badgeClass = 'cal-event';
    if (evt.type === 'yarisma') badgeClass = 'cal-competition';
    else if (evt.type === 'egitim') badgeClass = 'cal-training';
    else if (evt.type === 'party') badgeClass = 'cal-party';

    const calUrl = getGoogleCalendarUrl(evt.name, evt.date, evt.location);

    tr.innerHTML = `
      <td>${escapeHTML(evt.name)}</td>
      <td><span class="cal-badge ${badgeClass}">${escapeHTML(EVENT_TYPES[evt.type] || evt.type)}</span></td>
      <td>${escapeHTML(evt.date)}</td>
      <td>${escapeHTML(evt.location)}</td>
      <td>
        <a href="${calUrl}" target="_blank" rel="noopener" class="btn-cal-add" title="Takvime Ekle">
          <i class="fa-solid fa-calendar-plus"></i>
        </a>
      </td>
      ${isAdmin ? `<td><button class="admin-delete-btn" data-event-index="${i}" title="Sil">✕</button></td>` : ''}
    `;
    tbody.appendChild(tr);
  });

  // Bind delete buttons
  if (isAdmin) {
    tbody.querySelectorAll('.admin-delete-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.eventIndex, 10);
        if (confirm('Bu etkinliği silmek istediğinize emin misiniz?')) {
          deleteCalendarEvent(idx);
        }
      });
    });
  }
}

/** Opens an inline form for adding a new calendar event. */
function openEventForm() {
  // Prevent duplicate forms
  if (document.querySelector('.admin-event-form')) return;

  const form = document.createElement('div');
  form.className = 'admin-inline-form admin-event-form';
  form.innerHTML = `
    <h4>Yeni Etkinlik</h4>
    <label>Etkinlik Adı
      <input type="text" id="event-name" required />
    </label>
    <label>Tarih
      <input type="date" id="event-date" required />
    </label>
    <label>Konum
      <input type="text" id="event-location" required />
    </label>
    <label>Tür
      <select id="event-type">
        <option value="egitim">Eğitim</option>
        <option value="yarisma">Yarışma</option>
        <option value="etkinlik">Etkinlik</option>
        <option value="party">Party</option>
      </select>
    </label>
    <div class="admin-form-actions">
      <button type="button" id="event-submit-btn" class="admin-btn">Ekle</button>
      <button type="button" id="event-cancel-btn" class="admin-btn admin-btn--secondary">İptal</button>
    </div>
  `;

  // Insert after the add-event button
  const addBtn = document.querySelector('.admin-add-event-btn');
  addBtn?.parentNode?.insertBefore(form, addBtn.nextSibling);

  document.getElementById('event-submit-btn')?.addEventListener('click', () => {
    const name     = document.getElementById('event-name')?.value.trim();
    const date     = document.getElementById('event-date')?.value;
    const location = document.getElementById('event-location')?.value.trim();
    const type     = document.getElementById('event-type')?.value;

    if (!name || !date || !location) {
      alert('Lütfen tüm alanları doldurun.');
      return;
    }

    addCalendarEvent({ name, date, location, type });
    form.remove();
  });

  document.getElementById('event-cancel-btn')?.addEventListener('click', () => form.remove());
}

// ---------------------------------------------------------------------------
//  Training Management
// ---------------------------------------------------------------------------

/**
 * Reads trainings from localStorage.
 * @returns {Array<{title: string, description: string, date: string, instructor: string}>}
 */
function getTrainings() {
  try {
    return JSON.parse(localStorage.getItem(LS_TRAININGS_KEY)) || [];
  } catch {
    return [];
  }
}

/**
 * Saves trainings array to localStorage.
 * @param {Array} trainings
 */
function saveTrainings(trainings) {
  localStorage.setItem(LS_TRAININGS_KEY, JSON.stringify(trainings));
}

/**
 * Adds a training and re-renders.
 * @param {{ title: string, description: string, date: string, instructor: string }} training
 */
function addTraining(training) {
  const trainings = getTrainings();
  trainings.push(training);
  saveTrainings(trainings);
  renderTrainings();
}

/**
 * Deletes a training by index and re-renders.
 * @param {number} index
 */
function deleteTraining(index) {
  const trainings = getTrainings();
  trainings.splice(index, 1);
  saveTrainings(trainings);
  renderTrainings();
}

/** Renders all trainings into #trainings-dynamic as cards. */
function renderTrainings() {
  const container = document.getElementById('trainings-dynamic');
  if (!container) return;

  const trainings = getTrainings();
  const isAdmin   = document.body.classList.contains('admin-mode');

  container.innerHTML = '';

  trainings.forEach((t, i) => {
    const card = document.createElement('div');
    card.className = 'training-card dynamic-training';
    card.innerHTML = `
      <h4 class="training-card__title">${escapeHTML(t.title)}</h4>
      <p class="training-card__desc">${escapeHTML(t.description)}</p>
      <div class="training-card__meta">
        <span>📅 ${escapeHTML(t.date)}</span>
        <span>👤 ${escapeHTML(t.instructor)}</span>
      </div>
      ${isAdmin ? `<button class="admin-delete-btn" data-training-index="${i}" title="Sil">✕</button>` : ''}
    `;
    container.appendChild(card);
  });

  // Bind delete buttons
  if (isAdmin) {
    container.querySelectorAll('.admin-delete-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.trainingIndex, 10);
        if (confirm('Bu eğitimi silmek istediğinize emin misiniz?')) {
          deleteTraining(idx);
        }
      });
    });
  }
}

/** Opens an inline form for adding a new training. */
function openTrainingForm() {
  if (document.querySelector('.admin-training-form')) return;

  const form = document.createElement('div');
  form.className = 'admin-inline-form admin-training-form';
  form.innerHTML = `
    <h4>Yeni Eğitim</h4>
    <label>Başlık
      <input type="text" id="training-title" required />
    </label>
    <label>Açıklama
      <textarea id="training-description" rows="3" required></textarea>
    </label>
    <label>Tarih
      <input type="date" id="training-date" required />
    </label>
    <label>Eğitmen
      <input type="text" id="training-instructor" required />
    </label>
    <div class="admin-form-actions">
      <button type="button" id="training-submit-btn" class="admin-btn">Ekle</button>
      <button type="button" id="training-cancel-btn" class="admin-btn admin-btn--secondary">İptal</button>
    </div>
  `;

  const addBtn = document.querySelector('.admin-add-training-btn');
  addBtn?.parentNode?.insertBefore(form, addBtn.nextSibling);

  document.getElementById('training-submit-btn')?.addEventListener('click', () => {
    const title       = document.getElementById('training-title')?.value.trim();
    const description = document.getElementById('training-description')?.value.trim();
    const date        = document.getElementById('training-date')?.value;
    const instructor  = document.getElementById('training-instructor')?.value.trim();

    if (!title || !description || !date || !instructor) {
      alert('Lütfen tüm alanları doldurun.');
      return;
    }

    addTraining({ title, description, date, instructor });
    form.remove();
  });

  document.getElementById('training-cancel-btn')?.addEventListener('click', () => form.remove());
}

// ---------------------------------------------------------------------------
//  Utilities
// ---------------------------------------------------------------------------

/**
 * Simple HTML-escape to prevent XSS when rendering user-entered text.
 * @param {string} str
 * @returns {string}
 */
function escapeHTML(str = '') {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------------------------------------------------------------------------
//  Initialisation (runs on page load)
// ---------------------------------------------------------------------------

function init() {
  // Restore admin session if previously logged in
  if (localStorage.getItem(LS_ADMIN_STATE) === 'true') {
    activateAdminMode();
  }

  // Always render persisted dynamic content (visible to all visitors)
  renderCalendarEvents();
  renderTrainings();
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
