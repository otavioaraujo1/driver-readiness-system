document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const errorAlert = document.getElementById('errorAlert');
  const errorMessage = document.getElementById('errorMessage');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorAlert.classList.add('hidden');

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Redireciona para o painel do administrador em caso de sucesso
        window.location.href = '/admin';
      } else {
        // Exibe mensagem de erro da API ou uma mensagem padrão
        errorMessage.textContent = data.error || 'Erro ao realizar login. Tente novamente.';
        errorAlert.classList.remove('hidden');
      }
    } catch (err) {
      console.error(err);
      errorMessage.textContent = 'Erro ao se conectar com o servidor.';
      errorAlert.classList.remove('hidden');
    }
  });
});
