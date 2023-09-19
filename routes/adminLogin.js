const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const Admin = require("../models/adminModel");

router.get('/', function (req, res) {
  if(!req.session.admin || req.session.adminStatus !== 'logged-in'){
    res.render('adminLogin');
    } else {
    res.redirect('\adminHome');
    }
  });

router.post('/', async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const admin = await Admin.findOne({ email });
    const passwordMatch = await bcrypt.compare(password, admin.password);
    if((admin.email === email)&&(passwordMatch))
    {
      req.session.admin = email;
      req.session.adminStatus = 'logged-in';
      return res.redirect('/adminHome');
    }
     else {
      res.status(401).send('Invalid credentials');
    }
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).send('Internal server error');
  }
});

module.exports = router;