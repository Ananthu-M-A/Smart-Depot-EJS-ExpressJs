const mongoose = require('mongoose');

const cart = mongoose.Schema({
  customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'userLoginData',
      required: true,
    },
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
  createdTime: {
    type: String,
    required: true,
  },
});

const cartData = mongoose.model('cartData', cart);
module.exports = cartData;