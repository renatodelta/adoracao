<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Quinta-feira de Adoração - Comunidade do Formoso</title>
  <meta name="description" content="Escala de Horários de Adoração ao Santíssimo Sacramento - Comunidade do Formoso">
  <meta name="theme-color" content="#5c131d">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="Adoração Formoso">
  <link rel="apple-touch-icon" href="assets/custodia.jpg">
  <link rel="stylesheet" href="css/styles.css">
  <link rel="icon" href="assets/custodia.jpg" type="image/jpeg">
</head>
<body>

  <!-- Header Banner -->
  <header class="header-banner">
    <div class="header-content">
      <img src="assets/custodia.jpg" alt="Santíssimo Sacramento" class="monstrance-img">
      <h1 class="header-title">Quinta-feira de Adoração</h1>
      <p class="header-subtitle">"Vinde e Adoremos!" — Reserve seu momento com o Santíssimo Sacramento</p>
      <div class="community-badge">
        <span>📍 Comunidade do Formoso</span>
      </div>
    </div>
  </header>

  <main class="container">

    <!-- Controls & Actions -->
    <section class="control-bar">
      <div class="date-selector">
        <label for="adoracaoDate">📅 Data da Adoração:</label>
        <input type="date" id="adoracaoDate">
      </div>

      <div class="action-buttons">
        <button id="shareWpBtn" class="btn btn-whatsapp" title="Compartilhar lista de vagas no WhatsApp">
          📱 Enviar no WhatsApp
        </button>
        <button id="printBtn" class="btn btn-outline" title="Imprimir em formato de tabela igual ao Google Sheets">
          🖨️ Imprimir / PDF
        </button>
        <button id="resetBtn" class="btn btn-outline" style="font-size: 12px;" title="Restaurar horários padrão">
          🔄 Restaurar
        </button>
      </div>
    </section>

    <!-- Stats & Progress -->
    <section class="stats-card">
      <div class="stats-header">
        <span class="stats-title">Cobertura de Adoradores</span>
        <span class="stats-count" id="statsCount">Carregando...</span>
      </div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" id="progressFill"></div>
      </div>
      <div class="stats-subtext">Garantindo que Jesus esteja acompanhado durante toda a quinta-feira.</div>
    </section>

    <!-- Alert Banner for Missing Hours -->
    <div id="alertBanner" class="stats-card" style="display: none; border-left-color: #ef4444; background: #fff5f5; color: #991b1b; margin-bottom: 20px;">
    </div>

    <!-- Time Slots List -->
    <section class="slots-container" id="slotsList">
      <!-- Dynamic slot cards loaded via JS -->
    </section>

  </main>

  <!-- Modal Booking Dialog -->
  <div class="modal-overlay" id="bookingModal">
    <div class="modal-card">
      <div class="modal-header">
        <h3>Inscrever Horário de Adoração</h3>
        <button class="close-btn" id="closeModalBtn">&times;</button>
      </div>
      <form id="bookingForm">
        <div class="modal-body">
          <p style="margin-bottom: 16px; color: var(--text-secondary);">
            Você está se inscrevendo para o horário das <strong id="modalSlotTime" style="color: var(--primary-burgundy); font-size: 18px;"></strong>.
          </p>

          <div class="form-group">
            <label for="adorerName">Seu Nome Completo *</label>
            <input type="text" id="adorerName" placeholder="Ex: Maria da Silva" required autocomplete="name">
          </div>

          <div class="form-group">
            <label for="adorerPhone">Telefone / WhatsApp (Opcional)</label>
            <input type="tel" id="adorerPhone" placeholder="Ex: (35) 99999-9999" autocomplete="tel">
            <div class="form-help">Para lembretes do coordenador da comunidade.</div>
          </div>

          <div class="form-group">
            <label for="adorerIntention">Intenção de Oração (Opcional)</label>
            <textarea id="adorerIntention" rows="2" placeholder="Ex: Pelas famílias, pelos doentes da comunidade..."></textarea>
          </div>
        </div>
        <div class="modal-footer" style="padding: 0 24px 24px;">
          <button type="button" class="btn btn-outline" id="cancelModalBtn">Cancelar</button>
          <button type="submit" class="btn btn-gold">Confirmar Agendamento</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Printable Sheet View (Google Sheet Layout Replica for Printing) -->
  <div class="printable-sheet" id="printableSheet">
    <div style="display: flex; align-items: center; justify-content: space-around; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px;">
      <div style="text-align: center;">
        <img src="assets/custodia.jpg" alt="Logo" class="sheet-header-img" style="max-height: 100px;">
        <h2 style="font-family: var(--font-serif); font-size: 18px; text-transform: uppercase;">Quinta-feira de Adoração</h2>
        <p style="font-style: italic; font-size: 13px;">Vinde e Adoremos - Comunidade do Formoso</p>
        <p style="font-weight: bold; margin-top: 5px;">Data: <span id="printDateLabel"></span></p>
      </div>
    </div>

    <table class="sheet-table">
      <thead>
        <tr>
          <th style="width: 30%;">Horário</th>
          <th style="width: 70%;">Adorador</th>
        </tr>
      </thead>
      <tbody id="printTableBody">
        <!-- Rows populated dynamically -->
      </tbody>
    </table>
  </div>

  <script src="js/app.js"></script>
</body>
</html>
