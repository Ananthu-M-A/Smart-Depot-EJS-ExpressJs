const mongoose = require('mongoose');

const billingAddress = mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'userLoginData',
    required: true,
  },
  alternateMobileNo: {
    type: String,
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
  userCity: {
    type: String,
    required: true,
  },
  userState: {
    type: String,
    required: true,
  },
  userCountry: {
    type: String,
    required: true,
  },
  userZIP: {
    type: String,
    required: true,
  },
});

const billingAddressData = mongoose.model('billingAddressData', billingAddress);
module.exports = billingAddressData;