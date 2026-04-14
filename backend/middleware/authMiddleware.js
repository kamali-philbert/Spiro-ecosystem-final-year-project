const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ status: 'error', message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { user_id, role, ... }
    next();
  } catch (err) {
    res.status(401).json({ status: 'error', message: 'Token is not valid' });
  }
};

module.exports = authMiddleware;
