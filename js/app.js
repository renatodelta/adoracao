// JS App for Quinta-feira de Adoração - Comunidade do Formoso

document.addEventListener('DOMContentLoaded', () => {
  let currentDate = getNextThursdayDateStr();
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
      const response = await fetch(`api.php?date=${dateStr}`);
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

  // Render Schedule Grid & Printable View
  function renderUI() {
    if (!scheduleData || !scheduleData.slots) return;

    // Render Quote if present
    if (scheduleData.quote_text && quoteTextEl) {
      quoteTextEl.textContent = scheduleData.quote_text;
    }
    if (scheduleData.quote_author && quoteAuthorEl) {
      const authorText = scheduleData.quote_author.startsWith('—') ? scheduleData.quote_author : `— ${scheduleData.quote_author}`;
      quoteAuthorEl.textContent = authorText;
    }

    slotsList.innerHTML = '';
    printTableBody.innerHTML = '';
    printDateLabel.textContent = formatDateBR(currentDate);

    let filledCount = 0;
    let totalSlots = 0;
    let emptySlots = [];

    scheduleData.slots.forEach(slot => {
      const isClosing = slot.time === '19:00' || (slot.notes && slot.notes.toLowerCase().includes('encerramento'));
      const adorers = slot.adorers || [];
      const hasAdorers = adorers.length > 0;

      if (!isClosing) {
        totalSlots++;
        if (hasAdorers) filledCount++;
        else emptySlots.push(slot.time);
      }

      // Slot Card Element
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
              ${isAdmin ? `<button class="remove-btn" data-time="${slot.time}" data-index="${idx}" title="Remover adorador">&times;</button>` : ''}
            </span>
          `).join('') +
          `</div>`;
      } else if (isClosing) {
        adorersHtml = `<span style="color: var(--text-secondary); font-weight: 500;">Missa / Encerramento</span>`;
      } else {
        adorersHtml = `
          <div class="slot-empty-msg">
            <span>⚠️ Nenhum adorador inscrito ainda</span>
          </div>`;
      }

      card.innerHTML = `
        <div class="slot-time">
          <span class="slot-time-text">${slot.time}</span>
          ${statusBadgeHtml}
        </div>
        <div class="slot-info">
          ${adorersHtml}
        </div>
        <div class="slot-actions">
          ${!isClosing ? `
            <button class="btn btn-gold btn-sm open-book-btn" data-time="${slot.time}">
              ➕ Inscrever Horário
            </button>
          ` : ''}
        </div>
      `;

      slotsList.appendChild(card);

      // Printable Table Row (Google Sheet style)
      const tr = document.createElement('tr');
      const adorerNamesStr = adorers.map(a => a.name).join(' / ') || (isClosing ? 'Encerramento' : '-');
      tr.innerHTML = `
        <td style="font-weight: bold; font-family: var(--font-serif);">${slot.time}</td>
        <td>${escapeHtml(adorerNamesStr)}</td>
      `;
      printTableBody.appendChild(tr);
    });

    // Update Stats
    const percent = Math.round((filledCount / totalSlots) * 100) || 0;
    progressFill.style.width = `${percent}%`;
    statsCount.textContent = `${filledCount} de ${totalSlots} horários cobertos (${percent}%)`;

    if (emptySlots.length > 0) {
      alertBanner.style.display = 'block';
      alertBanner.innerHTML = `⚠️ <strong>Atenção:</strong> Faltam adoradores nos horários: <strong>${emptySlots.join(', ')}</strong>. Jesus te espera!`;
    } else {
      alertBanner.style.display = 'none';
    }

    // Attach Event Listeners to remove buttons & book buttons
    if (isAdmin) {
      document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const time = e.target.getAttribute('data-time');
          const index = parseInt(e.target.getAttribute('data-index'), 10);
          confirmRemoveAdorer(time, index);
        });
      });
    }

    document.querySelectorAll('.open-book-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const time = e.target.getAttribute('data-time');
        openBookingModal(time);
      });
    });
  }

  // Open Booking Modal
  function openBookingModal(time) {
    selectedTimeSlot = time;
    modalSlotTime.textContent = time;
    adorerNameInput.value = '';
    adorerIntentionInput.value = '';
    bookingModal.classList.add('active');
    adorerNameInput.focus();
  }

  // Close Booking Modal
  function closeModal() {
    bookingModal.classList.remove('active');
    selectedTimeSlot = null;
  }

  closeModalBtn.addEventListener('click', closeModal);
  cancelModalBtn.addEventListener('click', closeModal);

  // Booking Form Submit Handler
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
  });

  // Quote Edit Modal Handlers (Admin Only)
  if (editQuoteBtn) {
    editQuoteBtn.addEventListener('click', () => {
      editQuoteText.value = scheduleData.quote_text || (quoteTextEl ? quoteTextEl.textContent : '');
      editQuoteAuthor.value = (scheduleData.quote_author || (quoteAuthorEl ? quoteAuthorEl.textContent : '')).replace(/^—\s*/, '');
      quoteModal.classList.add('active');
      editQuoteText.focus();
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
          localStorage.setItem(`adoracao_${currentDate}`, JSON.stringify(scheduleData));
        }
      }

      closeQuoteModal();
      renderUI();
    });
  }

  // Remove Adorer Handler (Admin Only)
  async function confirmRemoveAdorer(time, index) {
    if (!confirm(`Deseja remover o adorador deste horário (${time})?`)) return;

    try {
      const response = await fetch('api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', date: currentDate, time, index })
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

  // Share via WhatsApp (Admin)
  if (shareWpBtn) {
    shareWpBtn.addEventListener('click', () => {
      if (!scheduleData || !scheduleData.slots) return;

      let emptyHours = [];
      let filledSummary = [];

      scheduleData.slots.forEach(slot => {
        const isClosing = slot.time === '19:00';
        if (isClosing) return;

        const adorers = (slot.adorers || []).map(a => a.name).join(', ');
        if (!adorers) {
          emptyHours.push(slot.time);
        } else {
          filledSummary.push(`• *${slot.time}*: ${adorers}`);
        }
      });

      let msg = `✝️ *QUINTA-FEIRA DE ADORAÇÃO - COMUNIDADE DO FORMOSO* ✝️\n\n`;
      msg += `📅 *Data:* ${formatDateBR(currentDate)}\n\n`;

      if (emptyHours.length > 0) {
        msg += `⚠️ *HORÁRIOS QUE PRECISAM DE ADORADOR:* \n`;
        msg += emptyHours.map(h => ` 🕒 ${h} - (VAGO)`).join('\n') + `\n\n`;
        msg += `Inscreva-se para garantir a presença diante do Santíssimo Sacramento.\n\n`;
      } else {
        msg += `*Todos os horários estão preenchidos. Louvado seja Nosso Senhor Jesus Cristo!*\n\n`;
      }

      msg += `📋 *Escala Atual:* \n` + filledSummary.join('\n') + `\n\n`;

      const qText = scheduleData.quote_text || "Mil anos de gozo humano não valem uma só hora passada em doce comunhão com Jesus no Santíssimo Sacramento.";
      const qAuthor = (scheduleData.quote_author || "São Padre Pio").replace(/^—\s*/, '');
      msg += `_“${qText}”_\n— *${qAuthor}*`;

      const encodedMsg = encodeURIComponent(msg);
      window.open(`https://api.whatsapp.com/send?text=${encodedMsg}`, '_blank');
    });
  }

  // Reset to default scale (Admin)
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      if (confirm("Tem certeza que deseja restaurar os horários padrão desta Quinta-feira?")) {
        try {
          const response = await fetch('api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'reset_day', date: currentDate })
          });
          if (response.ok) {
            const json = await response.json();
            scheduleData = json.data;
          } else {
            throw new Error('Fallback reset');
          }
        } catch (err) {
          localStorage.removeItem(`adoracao_${currentDate}`);
          scheduleData = getLocalStorageData(currentDate);
        }
        renderUI();
        alert("Horários restaurados para o padrão com sucesso!");
      }
    });
  }

  // Helpers
  function getNextThursdayDateStr() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 is Sun, 4 is Thu
    const distanceToThu = (4 - dayOfWeek + 7) % 7;
    const nextThu = new Date(today);
    nextThu.setDate(today.getDate() + (distanceToThu === 0 ? 0 : distanceToThu));
    return nextThu.toISOString().split('T')[0];
  }

  function formatDateBR(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  function escapeHtml(str) {
    return (str || '').replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[m]);
  }

  // Local Storage Fallback Functions
  function getLocalStorageData(dateStr) {
    const key = `adoracao_${dateStr}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try { return JSON.parse(stored); } catch (e) {}
    }
    const defaultData = {
      date: dateStr,
      quote_text: "Se desejas progredir na vida espiritual, aproxima-te frequentemente da Eucaristia.",
      quote_author: "São Boaventura",
      slots: [
        { time: "05:00", adorers: [{ name: "Rosário" }] },
        { time: "06:00", adorers: [{ name: "Rosário" }] },
        { time: "07:00", adorers: [] },
        { time: "08:00", adorers: [] },
        { time: "09:00", adorers: [] },
        { time: "10:00", adorers: [] },
        { time: "11:00", adorers: [] },
        { time: "12:00", adorers: [] },
        { time: "13:00", adorers: [] },
        { time: "14:00", adorers: [] },
        { time: "15:00", adorers: [] },
        { time: "16:00", adorers: [] },
        { time: "17:00", adorers: [] },
        { time: "18:00", adorers: [] },
        { time: "19:00", adorers: [{ name: "Encerramento" }], notes: "Encerramento" }
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
      localStorage.setItem(`adoracao_${dateStr}`, JSON.stringify(data));
      scheduleData = data;
    }
  }

  function removeLocalStorageAdorer(dateStr, time, index) {
    const data = getLocalStorageData(dateStr);
    const slot = data.slots.find(s => s.time === time);
    if (slot && slot.adorers && slot.adorers[index]) {
      slot.adorers.splice(index, 1);
      localStorage.setItem(`adoracao_${dateStr}`, JSON.stringify(data));
      scheduleData = data;
    }
  }

  // Initial Load
  loadSchedule(currentDate);
});
