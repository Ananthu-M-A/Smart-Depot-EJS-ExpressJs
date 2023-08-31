const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const Admin = require("../models/adminModel");

router.get('/', function (req, res, next) {
  res.render('adminLogin');
});

router.post('/', async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const admin = await Admin.findOne({ email });
    if((admin.email === email)&&(password === '1234'))
    {
      req.session.admin = email;
      res.redirect('/adminHome');
    }

    if (!admin) {
      res.status(400).send('Admin not found');
      return;
    }

    // const passwordMatch = await compare(password, admin.password);

    // if (passwordMatch) {
    //   res.render('adminHome');
    // } else {
    //   res.status(401).send('Invalid credentials');
    // }
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).send('Internal server error');
  }
});

module.exports = router;