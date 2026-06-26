const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'driver_readiness_super_secret_key_123';

function authenticateAdmin(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: 'Acesso negado. Token não encontrado.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
  }
}

module.exports = { authenticateAdmin, JWT_SECRET };
