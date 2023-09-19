let express = require('express');
const bcrypt = require('bcrypt');
const userController = require('../controllers/userControllers');
const UserLoginData = require("../models/userModel");
const transporter = require('../controllers/userOtpVerification');
const addressData = require('../models/addressModel');
const wishlistData = require('../models/wishlistModel');

const crypto = require('crypto');
let router = express.Router();

router.get('/', function(req, res, next) {
  res.render('signup');
});

router.post('/',async(req,res)=>{
  const { fullname, email, mobile, password } = req.body;
  const user = await UserLoginData.findOne({ email });

  if (user) {
    return res.status(400).send('You already have an account');
  }

  const otp = generateOTP();

  req.session.userData = {
    fullname,
    email,
    mobile,
    password,
    otp,
  };

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
    res.redirect('/signup/verify-otp');
  } catch (error) {
    console.error('Error saving user:', error);
  }

});

function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

router.get('/verify-otp',(req,res)=>{
  res.render('verifyOtp');
});

router.post('/verify-otp', async (req, res) => {
  const enteredOTP = req.body.otp;
  const storedUserData = req.session.userData;

  if (!storedUserData) {
    res.status(400).send('User data not found in session');
    return;
  }

  if (enteredOTP === storedUserData.otp) {
    const { fullname, email, mobile, password } = storedUserData;
    const hashedPassword = await bcrypt.hash(password, 10);

    const registerUserWithOTP = new UserLoginData({
      fullname,
      email,
      mobile,
      password: hashedPassword,
      blocked: false,
    });

    try {
      await registerUserWithOTP.save();
      req.session.userData = null;
      console.log(registerUserWithOTP._id);

      const address = new addressData({
        customerId: registerUserWithOTP._id,
        userName: fullname,
        userEmail: email,
        userMobileNo: mobile,
        alternateMobileNo: "Nil",
        userAddressLine1: "Nil",
        userAddressLine2: "Nil",
        userCountry: "Nil",
        userCity: "Nil",
        userState: "Nil",
        userZIP: "Nil",
      });
      const result = await address.save();

      res.render('login');
    } catch (error) {
      console.error('Error saving user:', error);
    }
  } else {
    req.session.userData = null;
    res.status(400).send('Invalid OTP');
  }
});


module.exports = router;
