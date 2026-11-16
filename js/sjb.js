// JS App for Cerco de Jericó — Paróquia São José (São José do Barreiro)

document.addEventListener('DOMContentLoaded', () => {
  const SCHEDULE_TYPE = 'sjb';
  const CERCO_DAYS = [
    { date: '2026-11-15', label: '15/11 (Dom)' },
    { date: '2026-11-16', label: '16/11 (Seg)' },
    { date: '2026-11-17', label: '17/11 (Ter)' },
    { date: '2026-11-18', label: '18/11 (Qua)' },
    { date: '2026-11-19', label: '19/11 (Qui)' },
    { date: '2026-11-20', label: '20/11 (Sex)' },
    { date: '2026-11-21', label: '21/11 (Sáb)' },
    { date: '2026-11-22', label: '22/11 (Dom)' }
  ];

  let currentDate = getInitialCercoDate();
  let scheduleData = null;
  let selectedTimeSlot = null;
  let activeFilter = 'all';

  // Admin Mode (?admin=true or ?admin=1)
  const urlParams = new URLSearchParams(window.location.search);
  const isAdmin = urlParams.get('admin') === 'true' || urlParams.get('admin') === '1';

  // DOM Elements
  const dateInput = document.getElementById('adoracaoDate');
  const cercoDaysBar = document.getElementById('cercoDaysBar');
  const slotsList = document.getElementById('slotsList');
  const progressFill = document.getElementById('progressFill');
  const statsCount = document.getElementById('statsCount');
  const alertBanner = document.getElementById('alertBanner');

  // Admin Elements
  const adminHeaderBadge = document.getElementById('adminHeaderBadge');
  const adminActionButtons = document.getElementById('adminActionButtons');
  const editQuoteBtn = document.getElementById('editQuoteBtn');
  const shareWpBtn = document.getElementById('shareWpBtn');
  const resetBtn = document.getElementById('resetBtn');
  const quoteTextEl = document.getElementById('quoteText');
  const quoteAuthorEl = document.getElementById('quoteAuthor');

  // Mobile Tabs
  const tabBtns = document.querySelectorAll('.sjb-tab-btn');
  const panelSchedule = document.getElementById('panelSchedule');
  const panelIntentions = document.getElementById('panelIntentions');
  const intentionsCountBadge = document.getElementById('intentionsCountBadge');

  // Filter Pills
  const filterPills = document.querySelectorAll('.sjb-filter-pill');

  // Inline Detail Drawer Elements
  const detailEmptyState = document.getElementById('detailEmptyState');
  const detailActiveState = document.getElementById('detailActiveState');
  const detailDateLabel = document.getElementById('detailDateLabel');
  const detailSlotTime = document.getElementById('detailSlotTime');
  const detailSlotBadge = document.getElementById('detailSlotBadge');
  const detailAdorersList = document.getElementById('detailAdorersList');
  const bookingSuccessNotice = document.getElementById('bookingSuccessNotice');
  const bookingForm = document.getElementById('bookingForm');
  const adorerNameInput = document.getElementById('adorerName');
  const adorerIntentionInput = document.getElementById('adorerIntention');
  const bookingSubmitBtn = document.getElementById('bookingSubmitBtn');

  // Prayer Book Elements
  const intentionsDateLabel = document.getElementById('intentionsDateLabel');
  const intentionsList = document.getElementById('intentionsList');
  const addGeneralIntentionForm = document.getElementById('addGeneralIntentionForm');
  const generalIntentionName = document.getElementById('generalIntentionName');
  const generalIntentionText = document.getElementById('generalIntentionText');

  // Poster Lightbox Elements
  const posterModal = document.getElementById('posterModal');
  const openPosterBtn = document.getElementById('openPosterBtn');
  const posterPreviewBtn = document.getElementById('posterPreviewBtn');
  const closePosterModalBtn = document.getElementById('closePosterModalBtn');

  // Quote Modal Elements
  const quoteModal = document.getElementById('quoteModal');
  const editQuoteText = document.getElementById('editQuoteText');
  const editQuoteAuthor = document.getElementById('editQuoteAuthor');
  const cancelQuoteModalBtn = document.getElementById('cancelQuoteModalBtn');
  const closeQuoteModalBtn = document.getElementById('closeQuoteModalBtn');
  const quoteForm = document.getElementById('quoteForm');

  // Print Table Elements
  const printTableBody = document.getElementById('printTableBody');
  const printDateLabel = document.getElementById('printDateLabel');

  // Admin Visibility
  if (isAdmin) {
    if (adminHeaderBadge) adminHeaderBadge.style.display = 'inline-block';
    if (adminActionButtons) adminActionButtons.style.display = 'flex';
  }

  // Render Quick 8-Day Selector
  function renderDaysStrip() {
    if (!cercoDaysBar) return;
    cercoDaysBar.innerHTML = CERCO_DAYS.map(d => `
      <button type="button" class="sjb-day-chip ${d.date === currentDate ? 'active' : ''}" data-date="${d.date}">
        ${d.label}
      </button>
    `).join('');

    cercoDaysBar.querySelectorAll('.sjb-day-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        currentDate = chip.dataset.date;
        dateInput.value = currentDate;
        selectedTimeSlot = null;
        renderDaysStrip();
        loadSchedule(currentDate);
      });
    });
  }

  // Poster Modal Handlers
  [openPosterBtn, posterPreviewBtn].forEach(el => {
    if (el && posterModal) {
      el.addEventListener('click', () => posterModal.classList.add('active'));
    }
  });
  if (closePosterModalBtn && posterModal) {
    closePosterModalBtn.addEventListener('click', () => posterModal.classList.remove('active'));
    posterModal.addEventListener('click', (e) => {
      if (e.target === posterModal) posterModal.classList.remove('active');
    });
  }

  // Mobile Tab Switching
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (target === 'schedule') {
        panelSchedule.classList.add('active');
        panelIntentions.classList.remove('active');
      } else {
        panelIntentions.classList.add('active');
        panelSchedule.classList.remove('active');
      }
    });
  });

  // Filter Switching
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      activeFilter = pill.dataset.filter;
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      renderGrid();
    });
  });

  // Date Picker
  dateInput.value = currentDate;
  dateInput.addEventListener('change', (e) => {
    currentDate = e.target.value;
    selectedTimeSlot = null;
    renderDaysStrip();
    loadSchedule(currentDate);
  });

  async function loadSchedule(dateStr) {
    slotsList.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 36px; color: var(--text-muted);">Carregando horários...</div>';

    try {
      const response = await fetch(`api.php?date=${dateStr}&type=${SCHEDULE_TYPE}`);
      if (response.ok) {
        const json = await response.json();
        scheduleData = json.data;
      } else {
        throw new Error('Fallback to local storage');
      }
    } catch (err) {
      scheduleData = getLocalStorageData(dateStr);
    }

    // Auto-select first empty slot on load
    if (!selectedTimeSlot && scheduleData && Array.isArray(scheduleData.slots)) {
      const firstEmpty = scheduleData.slots.find(s => !s.adorers || s.adorers.length === 0);
      if (firstEmpty) selectedTimeSlot = firstEmpty.time;
      else if (scheduleData.slots[0]) selectedTimeSlot = scheduleData.slots[0].time;
    }

    renderUI();
  }

  function isDawnSlot(timeStr) {
    const hour = parseInt((timeStr || '').split(':')[0], 10);
    return !isNaN(hour) && hour < 6;
  }

  function renderUI() {
    if (!scheduleData || !scheduleData.slots) return;

    if (scheduleData.quote_text && quoteTextEl) {
      quoteTextEl.innerHTML = escapeHtml(scheduleData.quote_text).replace(/\s*—\s*/g, '<br>');
    }
    if (scheduleData.quote_author && quoteAuthorEl) {
      quoteAuthorEl.textContent = scheduleData.quote_author.startsWith('—')
        ? scheduleData.quote_author
        : `— ${scheduleData.quote_author}`;
    }

    renderGrid();
    renderDetailDrawer();
    renderIntentionsList();
    renderPrintTable();
  }

  function renderGrid() {
    slotsList.innerHTML = '';

    let filledCount = 0;
    const totalSlots = scheduleData.slots.length;
    let emptySlots = [];

    scheduleData.slots.forEach(slot => {
      const adorers = slot.adorers || [];
      const hasAdorers = adorers.length > 0;
      const dawn = isDawnSlot(slot.time);

      if (hasAdorers) filledCount++;
      else emptySlots.push(slot.time);

      // Apply active filter
      if (activeFilter === 'empty' && hasAdorers) return;
      if (activeFilter === 'filled' && !hasAdorers) return;
      if (activeFilter === 'dawn' && !dawn) return;

      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'sjb-slot-tile';
      if (dawn) tile.classList.add('is-dawn');
      tile.classList.add(hasAdorers ? 'is-filled' : 'is-empty');

      if (selectedTimeSlot === slot.time) {
        tile.classList.add('is-selected');
      }

      const badgeHtml = adorers.length === 0
        ? `<span class="sjb-status-badge badge-empty">Vago</span>`
        : `<span class="sjb-status-badge badge-filled">${adorers.length} adorador${adorers.length > 1 ? 'es' : ''}</span>`;

      const previewText = hasAdorers
        ? adorers.map(a => a.name).join(', ')
        : (dawn ? '🌙 Madrugada · Vago' : 'Toque para inscrever');

      tile.innerHTML = `
        <div class="sjb-tile-top">
          <span class="sjb-tile-time">${dawn ? '🌙 ' : ''}${slot.time}</span>
          ${badgeHtml}
        </div>
        <div class="sjb-tile-preview ${hasAdorers ? 'has-names' : ''}">${escapeHtml(previewText)}</div>
      `;

      tile.addEventListener('click', () => {
        selectedTimeSlot = slot.time;
        if (bookingSuccessNotice) bookingSuccessNotice.style.display = 'none';
        renderGrid();
        renderDetailDrawer();

        if (window.innerWidth <= 960) {
          document.getElementById('slotDetailPanel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });

      slotsList.appendChild(tile);
    });

    if (slotsList.children.length === 0) {
      slotsList.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 28px; color: var(--text-muted); background: #fff; border-radius: 12px; border: 1px dashed var(--border-subtle);">Nenhum horário encontrado para este filtro.</div>`;
    }

    // Update Coverage
    const percent = Math.round((filledCount / totalSlots) * 100) || 0;
    progressFill.style.width = `${percent}%`;
    statsCount.textContent = `${filledCount}/${totalSlots} (${percent}%)`;

    // Update Alert Banner
    if (emptySlots.length > 0) {
      alertBanner.style.display = 'block';
      alertBanner.innerHTML = `<strong>⚠️ Horários vagos (${emptySlots.length}):</strong> ${emptySlots.join(' · ')}`;
    } else {
      alertBanner.style.display = 'none';
    }
  }

  function renderDetailDrawer() {
    if (!selectedTimeSlot || !scheduleData) {
      detailEmptyState.style.display = 'block';
      detailActiveState.style.display = 'none';
      return;
    }

    const slot = scheduleData.slots.find(s => s.time === selectedTimeSlot);
    if (!slot) return;

    const adorers = slot.adorers || [];
    const dawn = isDawnSlot(slot.time);

    detailEmptyState.style.display = 'none';
    detailActiveState.style.display = 'block';
    if (detailDateLabel) detailDateLabel.textContent = formatDateBR(currentDate);
    detailSlotTime.textContent = `${dawn ? '🌙 ' : ''}${slot.time}h`;

    if (adorers.length === 0) {
      detailSlotBadge.textContent = 'Horário Vago';
      detailSlotBadge.className = 'sjb-status-badge badge-empty';
    } else {
      detailSlotBadge.textContent = `${adorers.length} Adorador${adorers.length > 1 ? 'es' : ''}`;
      detailSlotBadge.className = 'sjb-status-badge badge-filled';
    }

    bookingForm.style.display = 'flex';
    bookingSubmitBtn.textContent = `✅ Confirmar Adoração às ${slot.time}`;

    if (adorers.length > 0) {
      detailAdorersList.innerHTML = adorers.map((a, idx) => `
        <span class="sjb-adorer-chip">
          👤 ${escapeHtml(a.name)}
          ${isAdmin ? `<button type="button" class="sjb-remove-btn" data-time="${slot.time}" data-index="${idx}" title="Remover">&times;</button>` : ''}
        </span>
      `).join('');

      if (isAdmin) {
        detailAdorersList.querySelectorAll('.sjb-remove-btn').forEach(btn => {
          btn.addEventListener('click', () => confirmRemoveAdorer(btn.dataset.time, btn.dataset.index));
        });
      }
    } else {
      detailAdorersList.innerHTML = `<span class="sjb-muted">Ainda não há ninguém inscrito neste horário. Seja o primeiro!</span>`;
    }
  }

  function renderIntentionsList() {
    if (!scheduleData) return;
    intentionsDateLabel.textContent = formatDateBR(currentDate);

    const intentions = [];
    (scheduleData.slots || []).forEach(slot => {
      (slot.adorers || []).forEach(a => {
        if (a.intention && a.intention.trim()) {
          intentions.push({ name: a.name || 'Adorador', time: slot.time, text: a.intention.trim() });
        }
      });
    });
    (scheduleData.general_intentions || []).forEach(item => {
      if (item.intention && item.intention.trim()) {
        intentions.push({ name: item.name || 'Anônimo', time: null, text: item.intention.trim() });
      }
    });

    if (intentionsCountBadge) {
      intentionsCountBadge.textContent = intentions.length;
    }

    if (intentions.length === 0) {
      intentionsList.innerHTML = `
        <div class="sjb-intentions-empty">
          🕊️ Ainda não há pedidos registrados para esta data. Deixe sua intenção abaixo!
        </div>
      `;
      return;
    }

    intentionsList.innerHTML = intentions.map(item => `
      <div class="sjb-intention-item">
        <div class="sjb-intention-meta">
          <span>🙏 ${escapeHtml(item.name)}</span>
          ${item.time ? `<span class="sjb-intention-time">${item.time}h</span>` : '<span class="sjb-intention-time">Cerco de Jericó</span>'}
        </div>
        <div class="sjb-intention-body">“${escapeHtml(item.text)}”</div>
      </div>
    `).join('');
  }

  function renderPrintTable() {
    if (!printTableBody || !scheduleData) return;
    printDateLabel.textContent = formatDateBR(currentDate);
    printTableBody.innerHTML = '';

    scheduleData.slots.forEach(slot => {
      const names = (slot.adorers || []).map(a => a.name).join(' / ') || '-';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: bold;">${slot.time}</td>
        <td>${escapeHtml(names)}</td>
      `;
      printTableBody.appendChild(tr);
    });
  }

  // Inline Booking Submit
  bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = adorerNameInput.value.trim();
    const intention = adorerIntentionInput.value.trim();
    if (!name || !selectedTimeSlot) return;

    try {
      const response = await fetch('api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'book',
          type: SCHEDULE_TYPE,
          date: currentDate,
          time: selectedTimeSlot,
          name,
          intention
        })
      });

      if (response.ok) {
        const json = await response.json();
        scheduleData = json.data;
      } else {
        throw new Error('Fallback local save');
      }
    } catch (err) {
      saveLocalStorageBook(currentDate, selectedTimeSlot, name, intention);
    }

    adorerNameInput.value = '';
    adorerIntentionInput.value = '';
    renderUI();
    if (bookingSuccessNotice) bookingSuccessNotice.style.display = 'block';
  });

  // Add General Intention Submit
  addGeneralIntentionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = generalIntentionName.value.trim();
    const intention = generalIntentionText.value.trim();
    if (!intention) return;

    try {
      const response = await fetch('api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_general_intention',
          type: SCHEDULE_TYPE,
          date: currentDate,
          name,
          intention
        })
      });

      if (response.ok) {
        const json = await response.json();
        scheduleData = json.data;
      } else {
        throw new Error('Fallback local save');
      }
    } catch (err) {
      saveLocalStorageGeneralIntention(currentDate, name, intention);
    }

    generalIntentionName.value = '';
    generalIntentionText.value = '';
    renderIntentionsList();
  });

  // Admin: Remove Adorer
  async function confirmRemoveAdorer(time, index) {
    if (!confirm(`Deseja remover o adorador deste horário (${time})?`)) return;

    try {
      const response = await fetch('api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', type: SCHEDULE_TYPE, date: currentDate, time, index })
      });

      if (response.ok) {
        const json = await response.json();
        scheduleData = json.data;
      } else {
        throw new Error('Fallback local remove');
      }
    } catch (err) {
      removeLocalStorageAdorer(currentDate, time, index);
    }

    renderUI();
  }

  // Admin: Quote Modal
  if (editQuoteBtn) {
    editQuoteBtn.addEventListener('click', () => {
      editQuoteText.value = (scheduleData && scheduleData.quote_text) || quoteTextEl.textContent;
      editQuoteAuthor.value = ((scheduleData && scheduleData.quote_author) || quoteAuthorEl.textContent).replace(/^—\s*/, '');
      quoteModal.classList.add('active');
    });
  }
  if (closeQuoteModalBtn) closeQuoteModalBtn.addEventListener('click', () => quoteModal.classList.remove('active'));
  if (cancelQuoteModalBtn) cancelQuoteModalBtn.addEventListener('click', () => quoteModal.classList.remove('active'));

  if (quoteForm) {
    quoteForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = editQuoteText.value.trim();
      const author = editQuoteAuthor.value.trim();
      if (!text || !author) return;

      try {
        const response = await fetch('api.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save_quote',
            type: SCHEDULE_TYPE,
            date: currentDate,
            quote_text: text,
            quote_author: author
          })
        });
        if (response.ok) {
          const json = await response.json();
          scheduleData = json.data;
        } else {
          throw new Error('Fallback');
        }
      } catch (err) {
        if (scheduleData) {
          scheduleData.quote_text = text;
          scheduleData.quote_author = author;
          localStorage.setItem(`cerco_sjb_${currentDate}`, JSON.stringify(scheduleData));
        }
      }

      quoteModal.classList.remove('active');
      renderUI();
    });
  }

  // Admin: WhatsApp Share
  if (shareWpBtn) {
    shareWpBtn.addEventListener('click', () => {
      if (!scheduleData || !scheduleData.slots) return;

      let emptyHours = [];
      let filledSummary = [];

      scheduleData.slots.forEach(slot => {
        const adorers = (slot.adorers || []).map(a => a.name).join(', ');
        if (!adorers) emptyHours.push(slot.time);
        else filledSummary.push(`• *${slot.time}*: ${adorers}`);
      });

      let msg = `🎺 *CERCO DE JERICÓ — ADORAÇÃO DIA E NOITE* ✝️\n`;
      msg += `⛪ *Paróquia São José — São José do Barreiro (SP)*\n`;
      msg += `📅 *Data:* ${formatDateBR(currentDate)}\n\n`;

      if (emptyHours.length > 0) {
        msg += `⚠️ *HORÁRIOS QUE PRECISAM DE ADORADOR:*\n`;
        msg += emptyHours.map(h => ` 🕒 ${h} - (VAGO)`).join('\n') + `\n\n`;
      } else {
        msg += `*Todos os horários estão preenchidos! Louvado seja Nosso Senhor Jesus Cristo!*\n\n`;
      }

      if (filledSummary.length > 0) {
        msg += `📋 *Escala Atual:*\n` + filledSummary.join('\n') + `\n\n`;
      }
      msg += `_“Eu e minha casa serviremos ao Senhor.” (Js 24,15)_`;
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
    });
  }

  // Admin: Reset Day
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      if (!confirm('Tem certeza que deseja restaurar a escala deste dia?')) return;
      try {
        const response = await fetch('api.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reset_day', type: SCHEDULE_TYPE, date: currentDate })
        });
        if (response.ok) {
          const json = await response.json();
          scheduleData = json.data;
        } else {
          throw new Error('Fallback');
        }
      } catch (err) {
        localStorage.removeItem(`cerco_sjb_${currentDate}`);
        scheduleData = getLocalStorageData(currentDate);
      }
      renderUI();
    });
  }

  // Helpers
  function getInitialCercoDate() {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;
    if (todayStr >= '2026-11-15' && todayStr <= '2026-11-22') {
      return todayStr;
    }
    return '2026-11-16';
  }

  function formatDateBR(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }

  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // LocalStorage Fallbacks
  function getLocalStorageData(dateStr) {
    const key = `cerco_sjb_${dateStr}`;
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);

    const slots = [];
    for (let h = 0; h < 24; h++) {
      const time = `${String(h).padStart(2, '0')}:00`;
      slots.push({ time, adorers: [], notes: h < 6 ? 'Madrugada' : '' });
    }

    return {
      date: dateStr,
      quote_text: '“Eu e minha casa serviremos ao Senhor.” (Js 24,15) — “Buscai o Senhor enquanto Ele se deixa encontrar.” (Is 55,6)',
      quote_author: 'Cerco de Jericó · 15 a 22 de Novembro · Paróquia São José',
      general_intentions: [],
      slots
    };
  }

  function saveLocalStorageBook(dateStr, time, name, intention) {
    const data = getLocalStorageData(dateStr);
    const slot = data.slots.find(s => s.time === time);
    if (slot) {
      if (!slot.adorers) slot.adorers = [];
      slot.adorers.push({ name, intention });
      localStorage.setItem(`cerco_sjb_${dateStr}`, JSON.stringify(data));
      scheduleData = data;
    }
  }

  function removeLocalStorageAdorer(dateStr, time, index) {
    const data = getLocalStorageData(dateStr);
    const slot = data.slots.find(s => s.time === time);
    if (slot && slot.adorers) {
      slot.adorers.splice(index, 1);
      localStorage.setItem(`cerco_sjb_${dateStr}`, JSON.stringify(data));
      scheduleData = data;
    }
  }

  function saveLocalStorageGeneralIntention(dateStr, name, intention) {
    const data = getLocalStorageData(dateStr);
    if (!data.general_intentions) data.general_intentions = [];
    data.general_intentions.push({ name: name || 'Anônimo', intention });
    localStorage.setItem(`cerco_sjb_${dateStr}`, JSON.stringify(data));
    scheduleData = data;
  }

  // Initial Load
  renderDaysStrip();
  loadSchedule(currentDate);
});
