const assert = require('assert');

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('🧪 Iniciando testes de integração da API...');
  let cookieHeader = '';
  let testDriverId = null;

  try {
    // 1. Testar login administrativo
    console.log('1. Testando login administrativo...');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    assert.strictEqual(loginRes.status, 200, 'Login falhou.');
    const loginData = await loginRes.json();
    assert.ok(loginData.success, 'Login data success deve ser verdadeiro.');

    // Capturar o cookie do cabeçalho
    const setCookie = loginRes.headers.get('set-cookie');
    if (setCookie) {
      cookieHeader = setCookie.split(';')[0];
    }
    assert.ok(cookieHeader.includes('token='), 'Cookie token não recebido.');
    console.log('✅ Login administrativo bem-sucedido!');

    // 2. Testar buscar motoristas (inicialmente vazio ou com os inseridos anteriormente)
    console.log('2. Testando listagem pública de motoristas...');
    const listRes = await fetch(`${BASE_URL}/api/drivers`);
    assert.strictEqual(listRes.status, 200, 'Erro ao buscar motoristas.');
    const initialDrivers = await listRes.json();
    assert.ok(Array.isArray(initialDrivers), 'Lista de motoristas deve ser um array.');
    console.log(`✅ Listagem pública funcionando! (${initialDrivers.length} motoristas encontrados)`);

    // 3. Testar cadastro de motorista (somente nome e placa)
    console.log('3. Testando cadastro de novo motorista...');
    const createRes = await fetch(`${BASE_URL}/api/admin/drivers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader
      },
      body: JSON.stringify({ nome: 'Motorista de Teste', placa: 'TST9X99' })
    });

    assert.strictEqual(createRes.status, 201, 'Erro ao cadastrar motorista.');
    const newDriver = await createRes.json();
    assert.ok(newDriver.id, 'O ID do motorista deve ser gerado.');
    assert.strictEqual(newDriver.nome, 'Motorista de Teste');
    assert.strictEqual(newDriver.placa, 'TST9X99');
    testDriverId = newDriver.id;
    console.log(`✅ Motorista cadastrado com ID: ${testDriverId}`);

    // 4. Verificar se o motorista cadastrado possui status NÃO APTO com 4 pendências
    console.log('4. Verificando status inicial do checklist do motorista...');
    const checkRes = await fetch(`${BASE_URL}/api/drivers`);
    const driversList = await checkRes.json();
    const createdDriver = driversList.find(d => d.id === testDriverId);
    
    assert.ok(createdDriver, 'Motorista recém-criado não foi encontrado na listagem.');
    assert.strictEqual(createdDriver.status, 'NÃO APTO', 'Status inicial deve ser NÃO APTO.');
    assert.strictEqual(createdDriver.pendencias.length, 4, 'Deve possuir 4 pendências inicialmente.');
    console.log('✅ Status inicial e pendências validados com sucesso!');

    // 5. Testar atualizar o checklist do motorista (marcar tudo como concluído)
    console.log('5. Atualizando checklist para APTO...');
    const checklistUpdateRes = await fetch(`${BASE_URL}/api/admin/checklists/${testDriverId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader
      },
      body: JSON.stringify({
        veicular: true,
        treinamento: true,
        briefing: true,
        disponibilidade: true
      })
    });

    assert.strictEqual(checklistUpdateRes.status, 200, 'Erro ao atualizar checklist.');
    console.log('✅ Checklist atualizado no servidor.');

    // 6. Verificar se o motorista agora é APTO e sem pendências
    console.log('6. Verificando alteração de status para APTO na listagem pública...');
    const afterUpdateRes = await fetch(`${BASE_URL}/api/drivers`);
    const driversListAfter = await afterUpdateRes.json();
    const updatedDriver = driversListAfter.find(d => d.id === testDriverId);

    assert.strictEqual(updatedDriver.status, 'APTO', 'Status deve mudar para APTO.');
    assert.strictEqual(updatedDriver.pendencias.length, 0, 'Não deve possuir pendências.');
    assert.ok(updatedDriver.updated_at, 'Coluna updated_at deve possuir um timestamp.');
    console.log('✅ Regra de negócio APTO e timestamps validados!');

    // 6.5 Testar endpoint de histórico
    console.log('6.5 Testando endpoint de histórico de auditoria...');
    const historyRes = await fetch(`${BASE_URL}/api/admin/drivers/${testDriverId}/history`, {
      headers: { 'Cookie': cookieHeader }
    });
    assert.strictEqual(historyRes.status, 200, 'Erro ao buscar histórico.');
    const historyData = await historyRes.json();
    assert.strictEqual(historyData.driver.nome, 'Motorista de Teste');
    assert.ok(Array.isArray(historyData.history), 'Historico retornado deve ser um array.');
    assert.strictEqual(historyData.history.length, 4, 'O histórico deve conter exatamente 4 registros correspondendo às alterações do checklist.');
    assert.strictEqual(historyData.history[0].antigo, 0, 'Estado anterior deve ser 0 (Pendente).');
    assert.strictEqual(historyData.history[0].novo, 1, 'Estado novo deve ser 1 (Concluído).');
    console.log('✅ Histórico de auditoria verificado com sucesso!');

    // 7. Testar deleção de motorista
    console.log('7. Testando exclusão do motorista...');
    const deleteRes = await fetch(`${BASE_URL}/api/admin/drivers/${testDriverId}`, {
      method: 'DELETE',
      headers: { 'Cookie': cookieHeader }
    });

    assert.strictEqual(deleteRes.status, 200, 'Erro ao deletar motorista.');
    
    // Verificar se foi excluído
    const checkDeletedRes = await fetch(`${BASE_URL}/api/drivers`);
    const driversListFinal = await checkDeletedRes.json();
    const deletedDriver = driversListFinal.find(d => d.id === testDriverId);
    assert.strictEqual(deletedDriver, undefined, 'Motorista ainda existe após exclusão.');
    console.log('✅ Exclusão realizada e validada com sucesso!');

    console.log('\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO! 🚀');

  } catch (err) {
    console.error('\n❌ Falha no teste:', err.message);
    process.exit(1);
  }
}

runTests();
