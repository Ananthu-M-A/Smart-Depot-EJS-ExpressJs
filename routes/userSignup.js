let express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');

router.get('/', UserController.loadSignupPage);
router.post('/', UserController.signup);
router.get('/verify-otp', UserController.loadOtpPage);
router.post('/verify-otp', UserController.verifyOtp); 

module.exports = router;
