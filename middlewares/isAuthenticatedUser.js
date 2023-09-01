function isAuthenticatedUser(req, res, next) {
  if (!req.session.user || req.session.status !== 'logged-in') {
    return res.redirect('/login');
  }
  next();
}

module.exports = isAuthenticatedUser;