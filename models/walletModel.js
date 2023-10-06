const mongoose = require('mongoose');
const userLoginData = require('./userModel');

const wallet = mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'userLoginData',
        required: true,
      },
    balance: {
        type: Number,
        default: 0,
        required: true,
      },
});


const walletData = mongoose.model('walletData', wallet);
module.exports = walletData;