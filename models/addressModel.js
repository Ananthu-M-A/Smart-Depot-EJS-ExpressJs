const mongoose = require('mongoose');

const billAddress = mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'userLoginData',
    required: true,
  },
  userFirstName: {
    type: String,
    required: true,
  },
  userLastName: {
    type: String,
    required: true,
  },
  userEmail: {
    type: String,
    required: true,
  },
  userMobileNo: {
    type: Number,
    required: true,
  },
  userAddressLine1: {
    type: String,
    required: true,
  },
  userAddressLine2: {
    type: String,
    required: true,
  },
  userCountry: {
    type: String,
    required: true,
  },
  userCity: {
    type: String,
    required: true,
  },
  userState: {
    type: String,
    required: true,
  },
  userZIP: {
    type: Number,
    required: true,
  },
});

const addressData = mongoose.model('addressData', billAddress);
module.exports = addressData;