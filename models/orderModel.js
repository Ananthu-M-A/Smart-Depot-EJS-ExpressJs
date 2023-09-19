const mongoose = require('mongoose');

const order = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserLoginData',
    required: true,
  },
  products: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'productData',
        required: true,
      },
      productQuantity: {
        type: Number,
        required: true,
      },
      productPrice: {
        type: Number,
        required: true,
      },
    },
  ],
  total: {
    type: Number,
    required: true,
  },
  orderDate: {
    type: String,
    required: true,
  },
  paymentMethod: {
    type: String,
    required: true,
  },
  address: {
    userFirstName: { type: String, required: true },
    userLastName: { type: String, required: true },
    userEmail: { type: String, required: true },
    userMobileNo: { type: String, required: true },
    userAddressLine1: { type: String, required: true },
    userAddressLine2: { type: String },
    userCountry: { type: String, required: true },
    userCity: { type: String, required: true },
    userState: { type: String, required: true },
    userZIP: { type: String, required: true },
  },
  orderStatus: {
    type: String,
    default: "orderInitiated",
  },
  returnOption: {
    type: Boolean,
    default: false,
  },
  deliveredDate : {
    type: String,
    required: false,
  },
  paymentStatus : {
    type: Boolean,
    required: true,
  }
});

const orderData = mongoose.model('orderData', order);
module.exports = orderData;
