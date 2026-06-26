document.addEventListener('DOMContentLoaded', () => {
  // Elementos do DOM - Barra Superior e Métricas
  const userBadge = document.getElementById('userBadge');
  const btnLogout = document.getElementById('btnLogout');
  const totalCount = document.getElementById('totalCount');
  const aptoCount = document.getElementById('aptoCount');
  const naoAptoCount = document.getElementById('naoAptoCount');
  
  // Elementos do Tabela e Filtros
  const searchInput = document.getElementById('searchInput');
  const adminDriversBody = document.getElementById('adminDriversBody');
  
  // Elementos do Modal de Cadastro
  const createModal = document.getElementById('createModal');
  const btnOpenCreateModal = document.getElementById('btnOpenCreateModal');
  const createDriverForm = document.getElementById('createDriverForm');
  const driverName = document.getElementById('driverName');
  const driverPlate = document.getElementById('driverPlate');
  const creationSuccess = document.getElementById('creationSuccess');
  const creationError = document.getElementById('creationError');
  const btnCancelCreate = document.getElementById('btnCancelCreate');
  const btnCancelCreateCross = document.getElementById('btnCancelCreateCross');
  
  // Elementos do Modal de Edição
  const editModal = document.getElementById('editModal');
  const editDriverForm = document.getElementById('editDriverForm');
  const editDriverId = document.getElementById('editDriverId');
  const editDriverName = document.getElementById('editDriverName');
  const editDriverPlate = document.getElementById('editDriverPlate');
  const editError = document.getElementById('editError');
  const btnCancelEdit = document.getElementById('btnCancelEdit');
  const btnCancelEditCross = document.getElementById('btnCancelEditCross');

  // Elementos do Modal de Histórico
  const historyModal = document.getElementById('historyModal');
  const historyDriverMeta = document.getElementById('historyDriverMeta');
  const historyTimeline = document.getElementById('historyTimeline');
  const emptyHistoryState = document.getElementById('emptyHistoryState');
  const btnCancelHistory = document.getElementById('btnCancelHistory');
  const btnCancelHistoryCross = document.getElementById('btnCancelHistoryCross');

  let allDrivers = [];
  let searchQuery = '';

  // 1. Verificar Sessão do Admin
  async function verifySession() {
    try {
      const response = await fetch('/api/auth/verify');
      if (!response.ok) {
        window.location.href = '/login';
        return;
      }
      const data = await response.json();
      userBadge.textContent = `Admin: ${data.user}`;
      fetchDrivers();
    } catch (err) {
      console.error(err);
      window.location.href = '/login';
    }
  }

  // 2. Logout do Admin
  btnLogout.addEventListener('click', async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (response.ok) {
        window.location.href = '/login';
      }
    } catch (err) {
      console.error('Erro ao deslogar:', err);
    }
  });

  // 3. Buscar Motoristas da API
  async function fetchDrivers() {
    try {
      const response = await fetch('/api/drivers');
      if (!response.ok) throw new Error('Falha ao carregar motoristas');
      allDrivers = await response.json();
      updateDashboard();
    } catch (err) {
      console.error(err);
      adminDriversBody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center" style="color: var(--color-nao-apto); padding: 3rem;">
            Ocorreu um erro ao carregar os motoristas. Tente recarregar a página.
          </td>
        </tr>
      `;
    }
  }

  // 4. Atualizar Métricas e Renderizar Tabela
  function updateDashboard() {
    const total = allDrivers.length;
    const aptos = allDrivers.filter(d => d.status === 'APTO').length;
    const naoAptos = total - aptos;

    totalCount.textContent = total;
    aptoCount.textContent = aptos;
    naoAptoCount.textContent = naoAptos;

    renderTable();
  }

  // 5. Renderizar Tabela de Motoristas
  function renderTable() {
    const filtered = allDrivers.filter(driver => {
      const nameMatch = driver.nome.toLowerCase().includes(searchQuery);
      const plateMatch = driver.placa.toLowerCase().includes(searchQuery);
      return nameMatch || plateMatch;
    });

    if (filtered.length === 0) {
      adminDriversBody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center text-muted" style="padding: 3rem;">Nenhum motorista encontrado.</td>
        </tr>
      `;
      return;
    }

    adminDriversBody.innerHTML = filtered.map(driver => {
      const isApto = driver.status === 'APTO';
      
      return `
        <tr>
          <td>
            <div class="driver-meta">
              <span class="driver-name-text">${escapeHTML(driver.nome)}</span>
              <span class="driver-plate-badge">${escapeHTML(driver.placa)}</span>
            </div>
          </td>
          <td class="text-center">
            <label class="switch">
              <input type="checkbox" data-driver-id="${driver.id}" data-type="veicular" ${driver.veicular ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </td>
          <td class="text-center">
            <label class="switch">
              <input type="checkbox" data-driver-id="${driver.id}" data-type="treinamento" ${driver.treinamento ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </td>
          <td class="text-center">
            <label class="switch">
              <input type="checkbox" data-driver-id="${driver.id}" data-type="briefing" ${driver.briefing ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </td>
          <td class="text-center">
            <label class="switch">
              <input type="checkbox" data-driver-id="${driver.id}" data-type="disponibilidade" ${driver.disponibilidade ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </td>
          <td class="text-center">
            <span class="status-pill ${isApto ? 'apto' : 'nao-apto'}">${driver.status}</span>
          </td>
          <td class="text-center text-muted" style="font-size: 0.8rem; font-family: monospace;">
            ${driver.updated_at ? driver.updated_at : 'Sem registro'}
          </td>
          <td class="text-right">
            <div class="action-buttons">
              <button class="btn-icon history" data-id="${driver.id}" title="Ver Histórico">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <button class="btn-icon edit" data-id="${driver.id}" title="Editar Motorista">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button class="btn-icon delete" data-id="${driver.id}" title="Excluir Motorista">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // 6. Gerenciamento do Modal de Cadastro (+ Novo Motorista)
  btnOpenCreateModal.addEventListener('click', () => {
    creationSuccess.classList.add('hidden');
    creationError.classList.add('hidden');
    createDriverForm.reset();
    createModal.classList.remove('hidden');
  });

  function closeCreateModal() {
    createModal.classList.add('hidden');
  }
  btnCancelCreate.addEventListener('click', closeCreateModal);
  btnCancelCreateCross.addEventListener('click', closeCreateModal);

  createDriverForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    creationSuccess.classList.add('hidden');
    creationError.classList.add('hidden');

    const nome = driverName.value.trim();
    const placa = driverPlate.value.trim();

    try {
      const response = await fetch('/api/admin/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, placa })
      });

      const data = await response.json();

      if (response.ok) {
        // Exibe mensagem de sucesso curta antes de fechar o modal
        creationSuccess.textContent = `Motorista ${data.nome} cadastrado!`;
        creationSuccess.classList.remove('hidden');
        
        setTimeout(() => {
          closeCreateModal();
          fetchDrivers();
        }, 1000);
      } else {
        creationError.textContent = data.error || 'Erro ao realizar cadastro.';
        creationError.classList.remove('hidden');
      }
    } catch (err) {
      console.error(err);
      creationError.textContent = 'Erro de comunicação com o servidor.';
      creationError.classList.remove('hidden');
    }
  });

  // 7. Confirmação e Atualização de Checklist (Switches)
  adminDriversBody.addEventListener('change', async (e) => {
    if (e.target.matches('input[type="checkbox"][data-driver-id]')) {
      const driverId = parseInt(e.target.getAttribute('data-driver-id'));
      const type = e.target.getAttribute('data-type');
      const isChecked = e.target.checked;

      const driver = allDrivers.find(d => d.id === driverId);
      if (!driver) return;

      // Exibir diálogo de confirmação antes de persistir
      const fieldNames = {
        veicular: 'Checklist Veicular',
        treinamento: 'Treinamento Aplicativo de Entrega',
        briefing: 'Briefing Operacional',
        disponibilidade: 'Aplicativo de Disponibilidade'
      };

      const statusLabel = isChecked ? 'CONCLUÍDO' : 'PENDENTE';
      const userConfirmed = confirm(`Deseja alterar o status de "${fieldNames[type]}" para ${statusLabel} para o motorista ${driver.nome}?`);

      if (!userConfirmed) {
        // Reverte a alteração visual se o usuário cancelar
        e.target.checked = !isChecked;
        return;
      }

      // Aplica a alteração localmente se confirmado
      const oldState = driver[type];
      driver[type] = isChecked;

      try {
        const response = await fetch(`/api/admin/checklists/${driverId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            veicular: driver.veicular,
            treinamento: driver.treinamento,
            briefing: driver.briefing,
            disponibilidade: driver.disponibilidade
          })
        });

        if (!response.ok) throw new Error();

        const data = await response.json();
        
        // Atualiza reativamente
        driver.updated_at = data.updated_at;
        const isApto = driver.veicular && driver.treinamento && driver.briefing && driver.disponibilidade;
        driver.status = isApto ? 'APTO' : 'NÃO APTO';
        
        updateDashboard();
      } catch (err) {
        console.error(err);
        alert('Erro ao atualizar item do checklist. Tente novamente.');
        // Reverte estado
        e.target.checked = oldState;
        driver[type] = oldState;
      }
    }
  });

  // 8. Event Delegation para Botões de Ações (Histórico, Editar e Excluir)
  adminDriversBody.addEventListener('click', async (e) => {
    const btnHistory = e.target.closest('.btn-icon.history');
    const btnEdit = e.target.closest('.btn-icon.edit');
    const btnDelete = e.target.closest('.btn-icon.delete');

    if (btnHistory) {
      const id = parseInt(btnHistory.getAttribute('data-id'));
      openHistoryModal(id);
    }

    if (btnEdit) {
      const id = parseInt(btnEdit.getAttribute('data-id'));
      openEditModal(id);
    }

    if (btnDelete) {
      const id = parseInt(btnDelete.getAttribute('data-id'));
      deleteDriver(id);
    }
  });

  // 9. Modal de Histórico
  async function openHistoryModal(id) {
    historyTimeline.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-muted);">Carregando histórico...</div>';
    emptyHistoryState.classList.add('hidden');
    historyDriverMeta.textContent = '';
    historyModal.classList.remove('hidden');

    try {
      const response = await fetch(`/api/admin/drivers/${id}/history`);
      if (!response.ok) throw new Error('Não foi possível obter o histórico.');
      
      const data = await response.json();
      historyDriverMeta.textContent = `${data.driver.nome} | Placa: ${data.driver.placa}`;

      if (!data.history || data.history.length === 0) {
        historyTimeline.innerHTML = '';
        emptyHistoryState.classList.remove('hidden');
        return;
      }

      historyTimeline.innerHTML = data.history.map(log => {
        const isNovoApto = log.novo === 1;
        return `
          <div class="timeline-item">
            <div class="timeline-badge ${isNovoApto ? 'success' : 'danger'}">
              ${isNovoApto ? '✓' : '✗'}
            </div>
            <div class="timeline-content">
              <span class="timeline-date">${log.timestamp}</span>
              <p class="timeline-text">
                O requisito <strong>${escapeHTML(log.campo)}</strong> foi alterado de 
                <span class="badge-old">${log.antigo === 1 ? 'Concluído' : 'Pendente'}</span> para 
                <span class="badge-new ${isNovoApto ? 'success' : 'danger'}">${isNovoApto ? 'Concluído' : 'Pendente'}</span>.
              </p>
            </div>
          </div>
        `;
      }).join('');

    } catch (err) {
      console.error(err);
      historyTimeline.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--color-nao-apto);">${err.message}</div>`;
    }
  }

  function closeHistoryModal() {
    historyModal.classList.add('hidden');
  }
  btnCancelHistory.addEventListener('click', closeHistoryModal);
  btnCancelHistoryCross.addEventListener('click', closeHistoryModal);

  // 10. Excluir Motorista
  async function deleteDriver(id) {
    const driver = allDrivers.find(d => d.id === id);
    if (!driver) return;

    const confirmDelete = confirm(`Tem certeza que deseja excluir o motorista ${driver.nome} (Placa: ${driver.placa})? Esta ação não pode ser desfeita e removerá todo seu histórico de alterações.`);
    if (!confirmDelete) return;

    try {
      const response = await fetch(`/api/admin/drivers/${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchDrivers();
      } else {
        const data = await response.json();
        alert(data.error || 'Erro ao excluir motorista.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao conectar ao servidor.');
    }
  }

  // 11. Modal de Edição de Motorista
  function openEditModal(id) {
    const driver = allDrivers.find(d => d.id === id);
    if (!driver) return;

    editError.classList.add('hidden');
    editDriverId.value = driver.id;
    editDriverName.value = driver.nome;
    editDriverPlate.value = driver.placa;
    editModal.classList.remove('hidden');
  }

  function closeEditModal() {
    editModal.classList.add('hidden');
    editDriverForm.reset();
  }

  btnCancelEdit.addEventListener('click', closeEditModal);
  btnCancelEditCross.addEventListener('click', closeEditModal);

  editDriverForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    editError.classList.add('hidden');

    const id = editDriverId.value;
    const nome = editDriverName.value.trim();
    const placa = editDriverPlate.value.trim();

    try {
      const response = await fetch(`/api/admin/drivers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, placa })
      });

      const data = await response.json();

      if (response.ok) {
        closeEditModal();
        fetchDrivers();
      } else {
        editError.textContent = data.error || 'Erro ao salvar alterações.';
        editError.classList.remove('hidden');
      }
    } catch (err) {
      console.error(err);
      editError.textContent = 'Erro ao se conectar ao servidor.';
      editError.classList.remove('hidden');
    }
  });

  // 12. Busca Cliente-side
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderTable();
  });

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

  // Inicializar verificação
  verifySession();
});
