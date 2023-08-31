function isAuthenticatedAdmin(req, res, next) {
    if (req.session && req.session.admin) {
      next();
    } else {
      res.redirect('/adminLogin');
    }
  }

  module.exports = isAuthenticatedAdmin;