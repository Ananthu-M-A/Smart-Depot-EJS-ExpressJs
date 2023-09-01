function isAuthenticatedAdmin(req, res, next) {
  if (!req.session.admin || req.session.adminStatus !== 'logged-in') {
    return res.redirect('/adminLogin');
  }
  next();
}

  module.exports = isAuthenticatedAdmin;