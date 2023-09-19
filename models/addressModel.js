const mongoose = require('mongoose');

const address = mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'userLoginData',
    required: true,
  },
  userName: {
    type: String,
    required: true,
  },
  userEmail: {
    type: String,
    required: true,
  },
  userMobileNo: {
    type: String,
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
    type: String,
    required: true,
  },
  userName2: {
    type: String,
  },
  userEmail2: {
    type: String,
  },
  alternateMobileNo2: {
    type: String,
  },
  userAddressLine12: {
    type: String,
  },
  userAddressLine22: {
    type: String,
  },
  userCountry2: {
    type: String,
  },
  userCity2: {
    type: String,
  },
  userState2: {
    type: String,
  },
  userZIP2: {
    type: String,
  },
  profileImageName: {
    type: String,
  },
});

const addressData = mongoose.model('addressData', address);
module.exports = addressData;