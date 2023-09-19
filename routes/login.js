const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const UserLoginData = require("../models/userModel");
const transporter = require('../controllers/userOtpVerification');
const crypto = require('crypto');

router.get('/', async (req, res) => {
  try {
    if (!req.session.user || req.session.status !== 'logged-in') {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.render('login');
    } else {
      res.redirect('\home');
    }
  } catch (error) {
    res.render('login', { error: 'Error fetching product data.' });
  }
});

router.get('/forgotPassword', async (req, res) => {
  try {
    res.render('forgotPassword');
  } catch (error) {
    res.render('login', { error: 'Error fetching product data.' });
  }
});

router.post('/forgotPassword', async (req, res, next) => {
  const { email } = req.body;
  const user = await UserLoginData.findOne({ email });

  if (!user) {
    return res.status(400).send('User not found');
  }

  const otp = generateOTP();
  req.session.userData = { email, otp };

  try {
    const mailOptions = {
      from: 'smartdepot494@gmail.com',
      to: req.session.userData.email,
      subject: 'OTP Verification',
      text: `Your OTP is: ${otp}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending OTP email:', error);
      } else {
        console.log('OTP email sent:', info.response);
      }
    });
    res.redirect('/login/verify-otp');
  } catch (error) {
    console.error('Error saving user:', error);
  }

});

function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

router.get('/verify-otp', (req, res) => {
  res.render('verifyOtpFP');
});

router.post('/verifyOtpFP', async (req, res) => {
  const enteredOTP = req.body.otp;
  const storedUserData = req.session.userData;
  if (!storedUserData) {
    res.status(400).send('User data not found in session');
    return;
  }

  if (enteredOTP === storedUserData.otp) 
  { res.render('addNewPassword'); }
  else {
  req.session.userData.otp = null;
  res.status(400).send('Invalid OTP');  
  }
});

router.post('/addNewPassword', async (req, res) => {
  try {
    const storedUserData = req.session.userData;
    const email = storedUserData.email;
    const { password, confirmPassword } = req.body;
    if (password === confirmPassword) {
      const hashedPassword = await bcrypt.hash(password, 10);
      const updatePasswordWithOTP = await UserLoginData.findOneAndUpdate({ email: email }, { password: hashedPassword });
      if (updatePasswordWithOTP.nModified !== 0) {
        req.session.userData = null;
        res.render('login');
      }
      else
      {
        res.redirect('/login/forgotPassword')
      }
    }
  } catch (error) {
    console.error('Error saving user:', error);
  }
});

router.post('/', async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const user = await UserLoginData.findOne({ email });

    if (!user) {
      return res.status(400).send('User not found');
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (passwordMatch) {
      req.session.user = user._id;
      req.session.status = 'logged-in';
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

