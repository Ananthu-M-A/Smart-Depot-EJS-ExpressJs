const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const UserLoginData = require("../models/userModel");     

router.get('/', function (req, res) {
  if(!req.session.user){
  res.render('login');
  } else {
  res.redirect('\home');
  }
});

router.post('/', async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const user = await UserLoginData.findOne({ email });

    if (!user) {
      return res.status(400).send('User not found');
    }

    if (user.blocked) {
      return res.status(400).send('You are not allowed');
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (passwordMatch) {
      req.session.user = email;
      return res.redirect('/home');
      
    } else {
      return res.status(401).send('Enter correct password');
    }
  } catch (error) {
    console.error('Error during login:', error);
    return res.status(500).send('Internal server error');
  }
});


module.exports = router;

