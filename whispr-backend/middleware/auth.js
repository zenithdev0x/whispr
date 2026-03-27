const jwt = require('jsonwebtoken')

// This runs before any route that needs a logged-in user
// It reads the token from the request header and finds the user
module.exports = function authMiddleware(req, res, next) {
  const header = req.headers.authorization

  // Token comes as "Bearer eyJhbGc..."
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not logged in' })
  }

  const token = header.split(' ')[1]

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded  // { id, ghost_username, college_name }
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Session expired — please log in again' })
  }
}
