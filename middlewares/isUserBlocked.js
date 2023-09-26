const userLoginData = require('../models/userModel');

async function isUserBlocked(req, res, next) {
    try {
        const blockStatus = await userLoginData.findOne({ _id: req.session.user }, { blocked: 1, _id: 0 });

        if(blockStatus.blocked)
        {
            req.session.destroy();
            req.session.status = 'logged-out';
            res.redirect('/userLogin');
        }
        next();
  } catch (error) {
    res.render('login', { error: 'Error logging in' });
  }
}
module.exports = isUserBlocked;