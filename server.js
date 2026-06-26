const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const path = require('path');
const { dbQuery } = require('./database');
const { authenticateAdmin, JWT_SECRET } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());

// Rotas de páginas (URL amigáveis)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/admin', (req, res) => {
  // Redireciona para o login caso tente acessar a página admin sem o token
  const token = req.cookies?.token;
  if (!token) {
    return res.redirect('/login');
  }
  try {
    jwt.verify(token, JWT_SECRET);
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
  } catch (err) {
    res.redirect('/login');
  }
});

// --- API de Autenticação ---

// Login do admin
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  // Credenciais estáticas para fins de administração simples
  const secureUser = process.env.ADMIN_USER || 'admin';
        const securePass = process.env.ADMIN_PASS || 'admin123';

        if (username === secureUser && password === securePass) {
            const token = jwt.sign({ username: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
    
    // Configura cookie httpOnly seguro
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 8 * 60 * 60 * 1000 // 8 horas
    });
    
    return res.json({ success: true, message: 'Login bem-sucedido.' });
  }

  return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logout realizado.' });
});

// Verificar se está logado
app.get('/api/auth/verify', authenticateAdmin, (req, res) => {
  res.json({ authenticated: true, user: req.admin.username });
});

// --- API Pública de Motoristas ---

// Buscar todos os motoristas com seus checklists e status calculado
app.get('/api/drivers', async (req, res) => {
  try {
    const query = `
      SELECT d.id, d.nome, d.placa, 
             c.veicular, c.treinamento, c.briefing, c.disponibilidade, c.updated_at
      FROM drivers d
      LEFT JOIN checklists c ON d.id = c.driver_id
      ORDER BY d.nome ASC
    `;
    const rows = await dbQuery.all(query);

    const drivers = rows.map(row => {
      const veicular = row.veicular === 1;
      const treinamento = row.treinamento === 1;
      const briefing = row.briefing === 1;
      const disponibilidade = row.disponibilidade === 1;

      const pendencias = [];
      if (!veicular) pendencias.push("Checklist Veicular");
      if (!treinamento) pendencias.push("Treinamento Aplicativo de Entrega");
      if (!briefing) pendencias.push("Briefing Operacional");
      if (!disponibilidade) pendencias.push("Aplicativo de Disponibilidade");

      const status = pendencias.length === 0 ? "APTO" : "NÃO APTO";

      return {
        id: row.id,
        nome: row.nome,
        placa: row.placa,
        veicular,
        treinamento,
        briefing,
        disponibilidade,
        status,
        pendencias,
        updated_at: row.updated_at || null
      };
    });

    res.json(drivers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao obter dados dos motoristas.' });
  }
});

// --- API Administrativa Protegida ---

// Cadastrar motorista
app.post('/api/admin/drivers', authenticateAdmin, async (req, res) => {
  const { nome, placa } = req.body;
  
  if (!nome || !placa) {
    return res.status(400).json({ error: 'Nome e placa do veículo são obrigatórios.' });
  }

  const cleanNome = nome.trim();
  const cleanPlaca = placa.trim().toUpperCase();

  try {
    // Validar se placa já existe
    const exists = await dbQuery.get('SELECT id FROM drivers WHERE placa = ?', [cleanPlaca]);
    if (exists) {
      return res.status(400).json({ error: 'Já existe um veículo cadastrado com esta placa.' });
    }

    // Inserir motorista
    const driverResult = await dbQuery.run(
      'INSERT INTO drivers (nome, placa) VALUES (?, ?)',
      [cleanNome, cleanPlaca]
    );
    const driverId = driverResult.id;

    const nowStr = new Date().toLocaleString('pt-BR');

    // Inicializar checklist zerado para o motorista com a data de cadastro
    await dbQuery.run(
      'INSERT INTO checklists (driver_id, veicular, treinamento, briefing, disponibilidade, updated_at) VALUES (?, 0, 0, 0, 0, ?)',
      [driverId, nowStr]
    );

    res.status(201).json({ id: driverId, nome: cleanNome, placa: cleanPlaca, updated_at: nowStr });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno ao cadastrar motorista.' });
  }
});

// Ativar checklist de todos os motoristas em massa
app.post('/api/admin/bulk/activate-all', authenticateAdmin, async (req, res) => {
  const fieldMapping = {
    veicular: 'Checklist Veicular',
    treinamento: 'Treinamento Aplicativo de Entrega',
    briefing: 'Briefing Operacional',
    disponibilidade: 'Aplicativo de Disponibilidade'
  };

  try {
    const rows = await dbQuery.all(`
      SELECT d.id,
             c.veicular, c.treinamento, c.briefing, c.disponibilidade
      FROM drivers d
      LEFT JOIN checklists c ON d.id = c.driver_id
    `);

    if (rows.length === 0) {
      return res.json({ success: true, updated: 0, message: 'Nenhum motorista cadastrado.' });
    }

    const nowStr = new Date().toLocaleString('pt-BR');
    let updatedCount = 0;

    for (const row of rows) {
      const current = {
        veicular: row.veicular === 1 ? 1 : 0,
        treinamento: row.treinamento === 1 ? 1 : 0,
        briefing: row.briefing === 1 ? 1 : 0,
        disponibilidade: row.disponibilidade === 1 ? 1 : 0
      };

      const allActive = Object.values(current).every(value => value === 1);
      if (allActive) continue;

      for (const [field, label] of Object.entries(fieldMapping)) {
        if (current[field] !== 1) {
          await dbQuery.run(
            'INSERT INTO checklist_history (driver_id, campo, antigo, novo, timestamp) VALUES (?, ?, ?, ?, ?)',
            [row.id, label, current[field], 1, nowStr]
          );
        }
      }

      await dbQuery.run(
        `UPDATE checklists
         SET veicular = 1, treinamento = 1, briefing = 1, disponibilidade = 1, updated_at = ?
         WHERE driver_id = ?`,
        [nowStr, row.id]
      );

      updatedCount += 1;
    }

    res.json({
      success: true,
      updated: updatedCount,
      message: `${updatedCount} motorista(s) ativado(s) com sucesso.`,
      updated_at: nowStr
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno ao ativar motoristas em massa.' });
  }
});

// Importar motoristas em lote via CSV
app.post('/api/admin/drivers/import', authenticateAdmin, async (req, res) => {
  const { drivers } = req.body;

  if (!Array.isArray(drivers) || drivers.length === 0) {
    return res.status(400).json({ error: 'Informe ao menos um motorista para importação.' });
  }

  const nowStr = new Date().toLocaleString('pt-BR');
  let imported = 0;
  const skipped = [];

  try {
    for (const item of drivers) {
      const nome = typeof item.nome === 'string' ? item.nome.trim() : '';
      const placa = typeof item.placa === 'string' ? item.placa.trim().toUpperCase() : '';

      if (!nome || !placa) {
        skipped.push('Linha inválida: nome ou placa ausente.');
        continue;
      }

      const exists = await dbQuery.get('SELECT id FROM drivers WHERE placa = ?', [placa]);
      if (exists) {
        skipped.push(`${nome} (${placa}) — placa já cadastrada.`);
        continue;
      }

      const driverResult = await dbQuery.run(
        'INSERT INTO drivers (nome, placa) VALUES (?, ?)',
        [nome, placa]
      );

      await dbQuery.run(
        'INSERT INTO checklists (driver_id, veicular, treinamento, briefing, disponibilidade, updated_at) VALUES (?, 0, 0, 0, 0, ?)',
        [driverResult.id, nowStr]
      );

      imported += 1;
    }

    res.status(201).json({
      success: true,
      imported,
      skipped,
      message: `${imported} motorista(s) importado(s) com sucesso.`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno ao importar motoristas.' });
  }
});

// Editar motorista (nome e placa)
app.put('/api/admin/drivers/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const { nome, placa } = req.body;

  if (!/^\d+$/.test(String(id))) {
    return res.status(404).json({ error: 'Motorista não encontrado.' });
  }

  if (!nome || !placa) {
    return res.status(400).json({ error: 'Nome e placa são obrigatórios para a edição.' });
  }

  const cleanNome = nome.trim();
  const cleanPlaca = placa.trim().toUpperCase();

  try {
    // Validar se placa já está em uso por outro motorista
    const exists = await dbQuery.get('SELECT id FROM drivers WHERE placa = ? AND id != ?', [cleanPlaca, id]);
    if (exists) {
      return res.status(400).json({ error: 'Esta placa já está sendo utilizada por outro veículo.' });
    }

    const result = await dbQuery.run(
      'UPDATE drivers SET nome = ?, placa = ? WHERE id = ?',
      [cleanNome, cleanPlaca, id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Motorista não encontrado.' });
    }

    res.json({ id, nome: cleanNome, placa: cleanPlaca });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno ao atualizar motorista.' });
  }
});

// Excluir motorista
app.delete('/api/admin/drivers/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await dbQuery.run('DELETE FROM drivers WHERE id = ?', [id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Motorista não encontrado.' });
    }
    res.json({ success: true, message: 'Motorista excluído com sucesso.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno ao excluir motorista.' });
  }
});

// Atualizar checklist de um motorista com log no histórico
app.put('/api/admin/checklists/:driver_id', authenticateAdmin, async (req, res) => {
  const { driver_id } = req.params;

  if (!/^\d+$/.test(driver_id)) {
    return res.status(404).json({ error: 'Motorista não encontrado.' });
  }
  const { veicular, treinamento, briefing, disponibilidade } = req.body;

  const vVal = veicular ? 1 : 0;
  const tVal = treinamento ? 1 : 0;
  const bVal = briefing ? 1 : 0;
  const dVal = disponibilidade ? 1 : 0;

  try {
    // Verifica se motorista existe
    const driverExists = await dbQuery.get('SELECT id FROM drivers WHERE id = ?', [driver_id]);
    if (!driverExists) {
      return res.status(404).json({ error: 'Motorista não encontrado.' });
    }

    // 1. Obter estado atual do checklist para calcular as mudanças do histórico
    const current = await dbQuery.get(
      'SELECT veicular, treinamento, briefing, disponibilidade FROM checklists WHERE driver_id = ?',
      [driver_id]
    );

    const nowStr = new Date().toLocaleString('pt-BR');
    const logs = [];

    if (current) {
      const fieldMapping = {
        veicular: 'Checklist Veicular',
        treinamento: 'Treinamento Aplicativo de Entrega',
        briefing: 'Briefing Operacional',
        disponibilidade: 'Aplicativo de Disponibilidade'
      };

      const changes = [
        { name: 'veicular', old: current.veicular, new: vVal },
        { name: 'treinamento', old: current.treinamento, new: tVal },
        { name: 'briefing', old: current.briefing, new: bVal },
        { name: 'disponibilidade', old: current.disponibilidade, new: dVal }
      ];

      for (const change of changes) {
        if (change.old !== change.new) {
          logs.push({
            driver_id,
            campo: fieldMapping[change.name],
            antigo: change.old,
            novo: change.new,
            timestamp: nowStr
          });
        }
      }
    }

    // 2. Atualizar o checklist e o timestamp de modificação
    await dbQuery.run(
      `UPDATE checklists 
       SET veicular = ?, treinamento = ?, briefing = ?, disponibilidade = ?, updated_at = ? 
       WHERE driver_id = ?`,
      [vVal, tVal, bVal, dVal, nowStr, driver_id]
    );

    // 3. Gravar histórico de auditoria
    if (logs.length > 0) {
      for (const log of logs) {
        await dbQuery.run(
          'INSERT INTO checklist_history (driver_id, campo, antigo, novo, timestamp) VALUES (?, ?, ?, ?, ?)',
          [log.driver_id, log.campo, log.antigo, log.novo, log.timestamp]
        );
      }
    }

    res.json({ success: true, message: 'Checklist atualizado com sucesso.', updated_at: nowStr });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno ao atualizar checklist.' });
  }
});

// Buscar histórico de alterações de checklist do motorista
app.get('/api/admin/drivers/:id/history', authenticateAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const driver = await dbQuery.get('SELECT nome, placa FROM drivers WHERE id = ?', [id]);
    if (!driver) {
      return res.status(404).json({ error: 'Motorista não encontrado.' });
    }

    const history = await dbQuery.all(
      `SELECT campo, antigo, novo, timestamp 
       FROM checklist_history 
       WHERE driver_id = ? 
       ORDER BY id DESC`,
      [id]
    );

    res.json({
      driver,
      history
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno ao carregar histórico.' });
  }
});

// Arquivos estáticos (CSS, JS, etc.) — após as rotas da API
app.use(express.static(path.join(__dirname, 'public')));

// Inicialização do servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Página pública em: http://localhost:${PORT}/`);
  console.log(`Área administrativa em: http://localhost:${PORT}/admin`);
});
