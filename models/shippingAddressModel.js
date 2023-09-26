const mongoose = require('mongoose');

const shippingAddress = mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'userLoginData',
    required: true,
  },
  altName: {
    type: String,
    required: true,
  },
  altEmail: {
    type: String,
    required: true,
  },
  altMobileNo: {
    type: String,
    required: true,
  },
  altAddressLine1: {
    type: String,
    required: true,
  },
  altAddressLine2: {
    type: String,
    required: true,
  },
  altCity: {
    type: String,
    required: true,
  },
  altState: {
    type: String,
    required: true,
  },
  altCountry: {
    type: String,
    required: true,
  },
  altZIP: {
    type: String,
    required: true,
  },
});

const shippingAddressData = mongoose.model('shippingAddressData', shippingAddress);
module.exports = shippingAddressData;