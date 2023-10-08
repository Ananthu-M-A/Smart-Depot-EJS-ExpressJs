const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');

router.get('/', UserController.loadLoginPage); 
router.get('/forgotPassword', UserController.loadForgotPasswordPage);
router.post('/forgotPassword', UserController.forgotPassword);
router.get('/verify-otp', UserController.loadOtpPageFP);
router.post('/verifyOtpFP', UserController.verifyOtpForgotPassword);
router.post('/addNewPassword', UserController.addNewPassword);
router.post('/', UserController.login);

module.exports = router;

