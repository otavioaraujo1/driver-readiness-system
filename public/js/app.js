document.addEventListener('DOMContentLoaded', () => {
  const driversGrid = document.getElementById('driversGrid');
  const totalCount = document.getElementById('totalCount');
  const aptoCount = document.getElementById('aptoCount');
  const naoAptoCount = document.getElementById('naoAptoCount');
  const searchInput = document.getElementById('searchInput');
  const emptyState = document.getElementById('emptyState');
  const tabBtns = document.querySelectorAll('.tab-btn');

  let allDrivers = [];
  let currentFilter = 'all';
  let searchQuery = '';

  // Carrega motoristas da API
  async function fetchDrivers() {
    try {
      const response = await fetch('/api/drivers');
      if (!response.ok) {
        throw new Error('Falha ao carregar motoristas');
      }
      allDrivers = await response.json();
      updateDashboard();
    } catch (err) {
      console.error(err);
      driversGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem 1rem; color: var(--color-nao-apto); background: var(--bg-secondary); border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">⚠️</div>
          <h4>Erro ao conectar ao servidor</h4>
          <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 0.25rem;">Não foi possível carregar os dados de prontidão. Verifique sua conexão.</p>
        </div>
      `;
    }
  }

  // Atualiza os contadores e renderiza a lista
  function updateDashboard() {
    const total = allDrivers.length;
    const aptos = allDrivers.filter(d => d.status === 'APTO').length;
    const naoAptos = total - aptos;

    totalCount.textContent = total;
    aptoCount.textContent = aptos;
    naoAptoCount.textContent = naoAptos;

    renderDrivers();
  }

  // Renderiza a listagem conforme os filtros
  function renderDrivers() {
    const filtered = allDrivers.filter(driver => {
      const nameMatch = driver.nome.toLowerCase().includes(searchQuery);
      const plateMatch = driver.placa.toLowerCase().includes(searchQuery);
      const matchesSearch = nameMatch || plateMatch;
      
      const matchesTab = currentFilter === 'all' ||
                         (currentFilter === 'apto' && driver.status === 'APTO') ||
                         (currentFilter === 'nao-apto' && driver.status === 'NÃO APTO');

      return matchesSearch && matchesTab;
    });

    // Ordenação: NÃO APTOS primeiro, seguido por ordem alfabética de nome
    filtered.sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'NÃO APTO' ? -1 : 1;
      }
      return a.nome.localeCompare(b.nome);
    });

    if (filtered.length === 0) {
      driversGrid.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');

    driversGrid.innerHTML = filtered.map(driver => {
      const isApto = driver.status === 'APTO';

      let checklistHTML = '';
      if (isApto) {
        checklistHTML = `
          <div class="ready-message">
            <svg class="check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
            </svg>
            <span>Motorista apto para operação</span>
          </div>
        `;
      } else {
        const checklistItems = [
          { label: 'Checklist Veicular', value: driver.veicular },
          { label: 'Treinamento Aplicativo', value: driver.treinamento },
          { label: 'Briefing Operacional', value: driver.briefing },
          { label: 'Aplicativo de Disponibilidade', value: driver.disponibilidade }
        ];

        const pendencias = checklistItems.filter(item => !item.value);
        const concluidos = checklistItems.filter(item => item.value);

        checklistHTML = `
          <div class="driver-checklist-preview highlighted-layout">
            <!-- Área Separada de Pendências Críticas -->
            <div class="pending-highlight-container">
              <span class="checklist-title pending-title">⚠️ Requisitos Pendentes:</span>
              <ul class="checklist-items-list pending-list">
                ${pendencias.map(item => `
                  <li class="checklist-item pending">
                    <span class="check-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style="width: 16px; height: 16px;">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm2.828-9.9a.75.75 0 10-1.06-1.06L10 8.94 8.232 7.172a.75.75 0 10-1.06 1.06L8.94 10l-1.77 1.768a.75.75 0 101.06 1.06L10 11.06l1.768 1.77a.75.75 0 101.06-1.06L11.06 10l1.77-1.768z" clip-rule="evenodd" />
                      </svg>
                    </span>
                    <span>${item.label}</span>
                  </li>
                `).join('')}
              </ul>
            </div>

            <!-- Área Separada de Concluídos -->
            ${concluidos.length > 0 ? `
              <div class="completed-container">
                <span class="checklist-title completed-title">✅ Concluídos:</span>
                <ul class="checklist-items-list completed-list">
                  ${concluidos.map(item => `
                    <li class="checklist-item done">
                      <span class="check-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style="width: 16px; height: 16px;">
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
                        </svg>
                      </span>
                      <span>${item.label}</span>
                    </li>
                  `).join('')}
                </ul>
              </div>
            ` : ''}
          </div>
        `;
      }

      return `
        <div class="driver-card ${isApto ? 'apto' : 'nao-apto'}">
          <div class="driver-card-header">
            <div class="driver-info">
              <span class="driver-name">${escapeHTML(driver.nome)}</span>
              <span class="driver-plate">${escapeHTML(driver.placa)}</span>
            </div>
            <span class="status-badge">${driver.status}</span>
          </div>
          ${checklistHTML}
        </div>
      `;
    }).join('');
  }

  // Prevenir injeção de HTML
  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  }

  // Eventos de Busca e Filtro
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderDrivers();
  });

  tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      tabBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentFilter = e.target.getAttribute('data-filter');
      renderDrivers();
    });
  });

  // Inicialização e polling automático a cada 15 segundos para atualizar
  fetchDrivers();
  setInterval(fetchDrivers, 15000);
});
