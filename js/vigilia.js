// JS App for Vigília de Cristo Rei — 24 Horas de Adoração

document.addEventListener('DOMContentLoaded', () => {
  const SCHEDULE_TYPE = 'vigilia';
  let currentDate = getVigilDefaultDateStr();
  let scheduleData = null;
  let selectedTimeSlot = null;

  // Detect Admin Mode from URL (?admin=true or ?admin=1 or /admin.html)
  const urlParams = new URLSearchParams(window.location.search);
  const isAdmin = urlParams.get('admin') === 'true' || urlParams.get('admin') === '1' || window.location.pathname.includes('admin');

  // DOM Elements
  const dateInput = document.getElementById('adoracaoDate');
  const slotsList = document.getElementById('slotsList');
  const progressFill = document.getElementById('progressFill');
  const statsCount = document.getElementById('statsCount');
  const alertBanner = document.getElementById('alertBanner');

  // Admin Elements
  const adminHeaderBadge = document.getElementById('adminHeaderBadge');
  const adminActionButtons = document.getElementById('adminActionButtons');
  const editQuoteBtn = document.getElementById('editQuoteBtn');
  const quoteTextEl = document.getElementById('quoteText');
  const quoteAuthorEl = document.getElementById('quoteAuthor');

  // Intentions Ticker Bar Elements
  const tickerTrack = document.getElementById('tickerTrack');
  const tickerTrackWrapper = document.getElementById('tickerTrackWrapper');
  const tickerAddBtn = document.getElementById('tickerAddBtn');

  // Booking Modal Elements
  const bookingModal = document.getElementById('bookingModal');
  const modalSlotTime = document.getElementById('modalSlotTime');
  const adorerNameInput = document.getElementById('adorerName');
  const adorerIntentionInput = document.getElementById('adorerIntention');
  const cancelModalBtn = document.getElementById('cancelModalBtn');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const bookingForm = document.getElementById('bookingForm');

  // Quote Modal Elements
  const quoteModal = document.getElementById('quoteModal');
  const editQuoteText = document.getElementById('editQuoteText');
  const editQuoteAuthor = document.getElementById('editQuoteAuthor');
  const cancelQuoteModalBtn = document.getElementById('cancelQuoteModalBtn');
  const closeQuoteModalBtn = document.getElementById('closeQuoteModalBtn');
  const quoteForm = document.getElementById('quoteForm');

  // Action Buttons
  const shareWpBtn = document.getElementById('shareWpBtn');
  const resetBtn = document.getElementById('resetBtn');

  // Intentions / Mural Elements
  const viewIntentionsBtn = document.getElementById('viewIntentionsBtn');
  const intentionsModal = document.getElementById('intentionsModal');
  const closeIntentionsModalBtn = document.getElementById('closeIntentionsModalBtn');
  const closeIntentionsFooterBtn = document.getElementById('closeIntentionsFooterBtn');
  const intentionsDateLabel = document.getElementById('intentionsDateLabel');
  const intentionsList = document.getElementById('intentionsList');
  const bookingSuccessNotice = document.getElementById('bookingSuccessNotice');
  const addGeneralIntentionForm = document.getElementById('addGeneralIntentionForm');
  const generalIntentionName = document.getElementById('generalIntentionName');
  const generalIntentionText = document.getElementById('generalIntentionText');

  // Printable Table Element
  const printTableBody = document.getElementById('printTableBody');
  const printDateLabel = document.getElementById('printDateLabel');

  // Apply Admin Visibility
  if (isAdmin) {
    if (adminHeaderBadge) adminHeaderBadge.style.display = 'inline-block';
    if (adminActionButtons) adminActionButtons.style.display = 'flex';
    if (editQuoteBtn) editQuoteBtn.style.display = 'inline-flex';
  } else {
    if (adminHeaderBadge) adminHeaderBadge.style.display = 'none';
    if (adminActionButtons) adminActionButtons.style.display = 'none';
    if (editQuoteBtn) editQuoteBtn.style.display = 'none';
  }

  // Set default date input
  dateInput.value = currentDate;

  // Date Change Listener
  dateInput.addEventListener('change', (e) => {
    currentDate = e.target.value;
    loadSchedule(currentDate);
  });

  // Load Schedule Data
  async function loadSchedule(dateStr) {
    slotsList.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--text-secondary);">Carregando horários...</div>';

    try {
      const response = await fetch(`api.php?date=${dateStr}&type=${SCHEDULE_TYPE}`);
      if (response.ok) {
        const json = await response.json();
        scheduleData = json.data;
      } else {
        throw new Error('Fallback to local storage');
      }
    } catch (err) {
      console.warn('API não disponível, utilizando armazenamento local:', err);
      scheduleData = getLocalStorageData(dateStr);
    }

    renderUI();
  }

  // Parse slot time label like "Sáb 17:00" or "Dom 00:00"
  function parseSlotTimeLabel(rawTime) {
    const parts = (rawTime || '').split(' ');
    if (parts.length === 2) {
      const dayAbbr = parts[0];
      const hour = parts[1];
      const dayFull = dayAbbr === 'Sáb' ? 'Sábado' : (dayAbbr === 'Dom' ? 'Domingo' : dayAbbr);
      return { dayAbbr, dayFull, hour, isSunday: dayAbbr === 'Dom' };
    }
    return { dayAbbr: '', dayFull: '', hour: rawTime, isSunday: false };
  }

  // Render Schedule Grid & Printable View
  function renderUI() {
    if (!scheduleData || !scheduleData.slots) return;

    if (scheduleData.quote_text && quoteTextEl) {
      quoteTextEl.textContent = scheduleData.quote_text;
    }
    if (scheduleData.quote_author && quoteAuthorEl) {
      const authorText = scheduleData.quote_author.startsWith('—') ? scheduleData.quote_author : `— ${scheduleData.quote_author}`;
      quoteAuthorEl.textContent = authorText;
    }

    slotsList.innerHTML = '';
    printTableBody.innerHTML = '';
    printDateLabel.textContent = formatVigilRangeBR(currentDate);

    let filledCount = 0;
    let totalSlots = 0;
    let emptySlots = [];

    scheduleData.slots.forEach(slot => {
      const isClosing = slot.time === 'Dom 17:00' || (slot.notes && slot.notes.toLowerCase().includes('encerramento'));
      const adorers = slot.adorers || [];
      const hasAdorers = adorers.length > 0;
      const parsedTime = parseSlotTimeLabel(slot.time);

      if (!isClosing) {
        totalSlots++;
        if (hasAdorers) filledCount++;
        else emptySlots.push(slot.time);
      }

      const card = document.createElement('div');
      card.className = 'slot-card';

      let statusBadgeHtml = '';
      if (isClosing) {
        statusBadgeHtml = `<span class="slot-status-tag tag-closing">Encerramento</span>`;
      } else if (adorers.length === 0) {
        statusBadgeHtml = `<span class="slot-status-tag tag-warning">Vago</span>`;
      } else if (adorers.length === 1) {
        statusBadgeHtml = `<span class="slot-status-tag tag-occupied">1 Adorador</span>`;
      } else {
        statusBadgeHtml = `<span class="slot-status-tag tag-free">${adorers.length} Adoradores</span>`;
      }

      let adorersHtml = '';
      if (hasAdorers) {
        adorersHtml = `<div class="slot-adorers-list">` +
          adorers.map((a, idx) => `
            <span class="adorer-badge">
              👤 ${escapeHtml(a.name)}
              ${isAdmin ? `<button class="remove-btn" data-time="${escapeHtml(slot.time)}" data-index="${idx}" title="Remover adorador">&times;</button>` : ''}
            </span>
          `).join('') +
          `</div>`;
      } else if (isClosing) {
        adorersHtml = `<span style="color: var(--text-secondary); font-weight: 500;">Santa Missa de Cristo Rei / Encerramento</span>`;
      } else {
        adorersHtml = `
          <div class="slot-empty-msg">
            <span>⚠️ Nenhum adorador inscrito ainda</span>
          </div>`;
      }

      card.innerHTML = `
        <div class="slot-time">
          ${parsedTime.dayFull ? `<span class="slot-day-label ${parsedTime.isSunday ? 'sunday' : ''}">${escapeHtml(parsedTime.dayFull)}</span>` : ''}
          <span class="slot-time-text">${escapeHtml(parsedTime.hour)}</span>
          ${statusBadgeHtml}
        </div>
        <div class="slot-info">
          ${adorersHtml}
        </div>
        <div class="slot-actions">
          ${!isClosing ? `
            <button class="btn btn-gold btn-sm open-book-btn" data-time="${escapeHtml(slot.time)}" title="Inscrever-se neste horário e registrar seu pedido de oração">
              ➕ Inscrever / Pedido de Oração
            </button>
          ` : ''}
        </div>
      `;

      slotsList.appendChild(card);

      const tr = document.createElement('tr');
      const adorerNamesStr = adorers.map(a => a.name).join(' / ') || (isClosing ? 'Santa Missa de Cristo Rei' : '-');
      tr.innerHTML = `
        <td style="font-weight: bold; font-family: var(--font-serif);">${escapeHtml(slot.time)}</td>
        <td>${escapeHtml(adorerNamesStr)}</td>
      `;
      printTableBody.appendChild(tr);
    });

    const percent = Math.round((filledCount / totalSlots) * 100) || 0;
    progressFill.style.width = `${percent}%`;
    statsCount.textContent = `${filledCount} de ${totalSlots} horários cobertos (${percent}%)`;

    if (emptySlots.length > 0) {
      alertBanner.style.display = 'block';
      alertBanner.innerHTML = `⚠️ <strong>Atenção:</strong> Faltam adoradores nos horários: <strong>${emptySlots.join(', ')}</strong>. Cristo Rei te espera!`;
    } else {
      alertBanner.style.display = 'none';
    }

    updateIntentionsTicker();

    if (isAdmin) {
      document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const time = e.currentTarget.getAttribute('data-time');
          const index = parseInt(e.currentTarget.getAttribute('data-index'), 10);
          confirmRemoveAdorer(time, index);
        });
      });
    }

    document.querySelectorAll('.open-book-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const time = e.currentTarget.getAttribute('data-time');
        openBookingModal(time);
      });
    });
  }

  function openBookingModal(time) {
    selectedTimeSlot = time;
    modalSlotTime.textContent = time;
    adorerNameInput.value = '';
    adorerIntentionInput.value = '';
    bookingModal.classList.add('active');
    bookingModal.scrollTop = 0;
    const modalBody = bookingModal.querySelector('.modal-body');
    if (modalBody) modalBody.scrollTop = 0;
    setTimeout(() => {
      adorerNameInput.focus();
    }, 150);
  }

  function closeModal() {
    bookingModal.classList.remove('active');
    selectedTimeSlot = null;
  }

  closeModalBtn.addEventListener('click', closeModal);
  cancelModalBtn.addEventListener('click', closeModal);

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
          name: name,
          intention: intention
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

    closeModal();
    renderUI();
    openIntentionsModal(true);
  });

  if (editQuoteBtn) {
    editQuoteBtn.addEventListener('click', () => {
      const currentText = (scheduleData && scheduleData.quote_text) ? scheduleData.quote_text : (quoteTextEl ? quoteTextEl.textContent : '');
      const currentAuthor = (scheduleData && scheduleData.quote_author) ? scheduleData.quote_author : (quoteAuthorEl ? quoteAuthorEl.textContent : '');
      editQuoteText.value = currentText;
      editQuoteAuthor.value = currentAuthor.replace(/^—\s*/, '');
      quoteModal.classList.add('active');
      quoteModal.scrollTop = 0;
      setTimeout(() => {
        editQuoteText.focus();
      }, 150);
    });
  }

  function closeQuoteModal() {
    quoteModal.classList.remove('active');
  }

  if (closeQuoteModalBtn) closeQuoteModalBtn.addEventListener('click', closeQuoteModal);
  if (cancelQuoteModalBtn) cancelQuoteModalBtn.addEventListener('click', closeQuoteModal);

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
          throw new Error('Fallback local save');
        }
      } catch (err) {
        if (scheduleData) {
          scheduleData.quote_text = text;
          scheduleData.quote_author = author;
          localStorage.setItem(`vigilia_cristo_rei_${currentDate}`, JSON.stringify(scheduleData));
        }
      }

      closeQuoteModal();
      renderUI();
    });
  }

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

  if (shareWpBtn) {
    shareWpBtn.addEventListener('click', () => {
      if (!scheduleData || !scheduleData.slots) return;

      let emptyHours = [];
      let filledSummary = [];

      scheduleData.slots.forEach(slot => {
        const isClosing = slot.time === 'Dom 17:00';
        if (isClosing) return;

        const adorers = (slot.adorers || []).map(a => a.name).join(', ');
        if (!adorers) {
          emptyHours.push(slot.time);
        } else {
          filledSummary.push(`• *${slot.time}*: ${adorers}`);
        }
      });

      let msg = `👑 *VIGÍLIA DE CRISTO REI — 24 HORAS DE ADORAÇÃO* ✝️\n\n`;
      msg += `📅 *Quando:* ${formatVigilRangeBR(currentDate)} (Sáb 17h às Dom 17h)\n\n`;

      if (emptyHours.length > 0) {
        msg += `⚠️ *HORÁRIOS QUE PRECISAM DE ADORADOR:* \n`;
        msg += emptyHours.map(h => ` 🕒 ${h} - (VAGO)`).join('\n') + `\n\n`;
        msg += `Inscreva-se para garantir a presença diante de Cristo Rei no Santíssimo Sacramento.\n\n`;
      } else {
        msg += `*Todos os 24 horários estão preenchidos! Louvado seja Nosso Senhor Jesus Cristo, Rei do Universo!*\n\n`;
      }

      if (filledSummary.length > 0) {
        msg += `📋 *Escala Atual:* \n` + filledSummary.join('\n') + `\n\n`;
      }

      const qText = scheduleData.quote_text || "O Senhor é Rei, revestiu-se de majestade. Vinde, adoremos a Cristo, Rei do Universo, no Santíssimo Sacramento!";
      const qAuthor = (scheduleData.quote_author || "Nosso Senhor Jesus Cristo, Rei do Universo").replace(/^—\s*/, '');
      msg += `_“${qText}”_\n— *${qAuthor}*`;

      const encodedMsg = encodeURIComponent(msg);
      window.open(`https://api.whatsapp.com/send?text=${encodedMsg}`, '_blank');
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      if (confirm("Tem certeza que deseja restaurar os horários padrão desta Vigília de Cristo Rei?")) {
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
            throw new Error('Fallback reset');
          }
        } catch (err) {
          localStorage.removeItem(`vigilia_cristo_rei_${currentDate}`);
          scheduleData = getLocalStorageData(currentDate);
        }
        renderUI();
        alert("Horários restaurados para o padrão com sucesso!");
      }
    });
  }

  function getVigilDefaultDateStr() {
    const today = new Date();
    if (today <= new Date(2026, 10, 22, 23, 59, 59)) {
      return '2026-11-21';
    }
    const dayOfWeek = today.getDay();
    const distanceToSat = (6 - dayOfWeek + 7) % 7;
    const targetSat = new Date(today.getFullYear(), today.getMonth(), today.getDate() + distanceToSat);
    const year = targetSat.getFullYear();
    const month = String(targetSat.getMonth() + 1).padStart(2, '0');
    const day = String(targetSat.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatVigilRangeBR(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-').map(Number);
    const start = new Date(parts[0], parts[1] - 1, parts[2]);
    const end = new Date(parts[0], parts[1] - 1, parts[2] + 1);
    const pad = n => String(n).padStart(2, '0');
    return `${pad(start.getDate())}/${pad(start.getMonth() + 1)} e ${pad(end.getDate())}/${pad(end.getMonth() + 1)}/${end.getFullYear()}`;
  }

  function escapeHtml(str) {
    return (str || '').replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[m]);
  }

  function getLocalStorageData(dateStr) {
    const key = `vigilia_cristo_rei_${dateStr}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try { return JSON.parse(stored); } catch (e) {}
    }
    const defaultData = {
      date: dateStr,
      quote_text: "O Senhor é Rei, revestiu-se de majestade. Vinde, adoremos a Cristo, Rei do Universo, no Santíssimo Sacramento!",
      quote_author: "Nosso Senhor Jesus Cristo, Rei do Universo · Encerramento do Ano Litúrgico",
      slots: [
        { time: "Sáb 17:00", adorers: [], notes: "Abertura da Vigília de Cristo Rei" },
        { time: "Sáb 18:00", adorers: [] },
        { time: "Sáb 19:00", adorers: [] },
        { time: "Sáb 20:00", adorers: [] },
        { time: "Sáb 21:00", adorers: [] },
        { time: "Sáb 22:00", adorers: [] },
        { time: "Sáb 23:00", adorers: [] },
        { time: "Dom 00:00", adorers: [], notes: "Madrugada" },
        { time: "Dom 01:00", adorers: [], notes: "Madrugada" },
        { time: "Dom 02:00", adorers: [], notes: "Madrugada" },
        { time: "Dom 03:00", adorers: [], notes: "Madrugada" },
        { time: "Dom 04:00", adorers: [], notes: "Madrugada" },
        { time: "Dom 05:00", adorers: [] },
        { time: "Dom 06:00", adorers: [] },
        { time: "Dom 07:00", adorers: [] },
        { time: "Dom 08:00", adorers: [] },
        { time: "Dom 09:00", adorers: [] },
        { time: "Dom 10:00", adorers: [] },
        { time: "Dom 11:00", adorers: [] },
        { time: "Dom 12:00", adorers: [] },
        { time: "Dom 13:00", adorers: [] },
        { time: "Dom 14:00", adorers: [] },
        { time: "Dom 15:00", adorers: [] },
        { time: "Dom 16:00", adorers: [] },
        { time: "Dom 17:00", adorers: [{ name: "Santa Missa de Cristo Rei" }], notes: "Missa / Encerramento" }
      ]
    };
    localStorage.setItem(key, JSON.stringify(defaultData));
    return defaultData;
  }

  function saveLocalStorageBook(dateStr, time, name, intention) {
    const data = getLocalStorageData(dateStr);
    const slot = data.slots.find(s => s.time === time);
    if (slot) {
      if (!slot.adorers) slot.adorers = [];
      slot.adorers.push({ name, intention });
      localStorage.setItem(`vigilia_cristo_rei_${dateStr}`, JSON.stringify(data));
      scheduleData = data;
    }
  }

  function removeLocalStorageAdorer(dateStr, time, index) {
    const data = getLocalStorageData(dateStr);
    const slot = data.slots.find(s => s.time === time);
    if (slot && slot.adorers && slot.adorers[index]) {
      slot.adorers.splice(index, 1);
      localStorage.setItem(`vigilia_cristo_rei_${dateStr}`, JSON.stringify(data));
      scheduleData = data;
    }
  }

  function openIntentionsModal(isPostBooking = false) {
    if (!intentionsModal) return;
    if (intentionsDateLabel) intentionsDateLabel.textContent = formatVigilRangeBR(currentDate);

    if (bookingSuccessNotice) {
      bookingSuccessNotice.style.display = isPostBooking ? 'flex' : 'none';
    }

    renderIntentionsList();
    intentionsModal.classList.add('active');

    const modalBody = intentionsModal.querySelector('.modal-body');
    if (modalBody) modalBody.scrollTop = 0;
  }

  function closeIntentionsModal() {
    if (!intentionsModal) return;
    intentionsModal.classList.remove('active');
  }

  if (viewIntentionsBtn) {
    viewIntentionsBtn.addEventListener('click', () => openIntentionsModal(false));
  }

  if (closeIntentionsModalBtn) closeIntentionsModalBtn.addEventListener('click', closeIntentionsModal);
  if (closeIntentionsFooterBtn) closeIntentionsFooterBtn.addEventListener('click', closeIntentionsModal);

  function renderIntentionsList() {
    if (!intentionsList) return;
    intentionsList.innerHTML = '';

    const allIntentions = [];

    if (scheduleData && Array.isArray(scheduleData.slots)) {
      scheduleData.slots.forEach(slot => {
        if (Array.isArray(slot.adorers)) {
          slot.adorers.forEach(adorer => {
            if (adorer.intention && adorer.intention.trim() !== '') {
              allIntentions.push({
                name: adorer.name || 'Adorador',
                time: slot.time,
                intention: adorer.intention.trim(),
                type: 'slot'
              });
            }
          });
        }
      });
    }

    if (scheduleData && Array.isArray(scheduleData.general_intentions)) {
      scheduleData.general_intentions.forEach(item => {
        if (item.intention && item.intention.trim() !== '') {
          allIntentions.push({
            name: item.name || 'Anônimo',
            time: null,
            intention: item.intention.trim(),
            type: 'general'
          });
        }
      });
    }

    if (allIntentions.length === 0) {
      intentionsList.innerHTML = `
        <div class="empty-intentions-card">
          <div class="empty-icon">🕊️</div>
          <p class="empty-title">Nenhum pedido de oração registrado ainda para esta vigília.</p>
          <p class="empty-desc">Inscreva-se em um dos horários acima para colocar suas preces diante de Cristo Rei no Santíssimo Sacramento!</p>
        </div>
      `;
      return;
    }

    allIntentions.forEach(item => {
      const card = document.createElement('div');
      card.className = 'intention-card';

      const badgeText = item.time ? `Horário: ${item.time}` : `Intenção da Comunidade`;

      card.innerHTML = `
        <div class="intention-card-header">
          <span class="intention-author">🙏 <strong>${escapeHtml(item.name)}</strong></span>
          <span class="intention-badge">${escapeHtml(badgeText)}</span>
        </div>
        <div class="intention-card-body">
          "${escapeHtml(item.intention)}"
        </div>
      `;
      intentionsList.appendChild(card);
    });
  }

  if (addGeneralIntentionForm) {
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
            name: name,
            intention: intention
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

      generalIntentionText.value = '';
      if (generalIntentionName) generalIntentionName.value = '';
      renderIntentionsList();
      renderUI();
    });
  }

  function saveLocalStorageGeneralIntention(dateStr, name, intention) {
    const data = getLocalStorageData(dateStr);
    if (!data.general_intentions) data.general_intentions = [];
    data.general_intentions.push({
      name: name || 'Anônimo',
      intention: intention
    });
    localStorage.setItem(`vigilia_cristo_rei_${dateStr}`, JSON.stringify(data));
    scheduleData = data;
  }

  function updateIntentionsTicker() {
    if (!tickerTrack) return;
    tickerTrack.innerHTML = '';

    const intentions = [];

    if (scheduleData && Array.isArray(scheduleData.slots)) {
      scheduleData.slots.forEach(slot => {
        if (Array.isArray(slot.adorers)) {
          slot.adorers.forEach(adorer => {
            if (adorer.intention && adorer.intention.trim()) {
              intentions.push({
                name: adorer.name || 'Adorador',
                time: slot.time,
                text: adorer.intention.trim()
              });
            }
          });
        }
      });
    }

    if (scheduleData && Array.isArray(scheduleData.general_intentions)) {
      scheduleData.general_intentions.forEach(item => {
        if (item.intention && item.intention.trim()) {
          intentions.push({
            name: item.name || 'Comunidade',
            time: null,
            text: item.intention.trim()
          });
        }
      });
    }

    let itemsHtml = '';
    if (intentions.length > 0) {
      const rendered = intentions.map(item => {
        const timeBadge = item.time ? ` (${item.time})` : '';
        return `
          <span class="ticker-item">
            <span class="ticker-item-dot">✦</span>
            <span class="ticker-item-name">${escapeHtml(item.name)}${escapeHtml(timeBadge)}:</span>
            <span class="ticker-item-text">"${escapeHtml(item.text)}"</span>
          </span>
        `;
      }).join('');
      itemsHtml = rendered + rendered;
      const duration = Math.max(25, intentions.length * 8);
      tickerTrack.style.animationDuration = `${duration}s`;
    } else {
      const emptyHtml = `
        <span class="ticker-item">
          <span class="ticker-item-dot">👑</span>
          <span class="ticker-item-text">"Cristo vence, Cristo reina, Cristo impera!" — Nosso Senhor Jesus Cristo, Rei do Universo</span>
        </span>
        <span class="ticker-item">
          <span class="ticker-item-dot">✦</span>
          <span class="ticker-item-name">Vigília 24 Horas:</span>
          <span class="ticker-item-text">De sábado às 17h até domingo às 17h (Santa Missa de Encerramento do Ano Litúrgico)</span>
        </span>
        <span class="ticker-item">
          <span class="ticker-item-dot">🕊️</span>
          <span class="ticker-item-text">Coloque suas preces aos pés de Jesus no Santíssimo Sacramento ao se inscrever em um horário</span>
        </span>
      `;
      itemsHtml = emptyHtml + emptyHtml;
      tickerTrack.style.animationDuration = '35s';
    }

    tickerTrack.innerHTML = itemsHtml;
  }

  if (tickerTrackWrapper) {
    tickerTrackWrapper.addEventListener('click', () => {
      openIntentionsModal(false);
    });
  }

  if (tickerAddBtn) {
    tickerAddBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openIntentionsModal(false);
      setTimeout(() => {
        if (generalIntentionText) generalIntentionText.focus();
      }, 350);
    });
  }

  // Initial Load
  loadSchedule(currentDate);
});
