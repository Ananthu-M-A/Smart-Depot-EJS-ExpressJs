const express = require('express');
const router = express.Router();

const PaymentController = require('../controllers/PaymentController');

router.get('/createOrder', PaymentController.createOrder);
router.post('/verifyPayment', PaymentController.verifyPayment);
router.post('/refund/:paymentId', PaymentController.initiateRefund);

module.exports = router;