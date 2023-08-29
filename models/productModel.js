const mongoose = require('mongoose');

const product = mongoose.Schema({
  productName: {
    type: String,
    required: true,
  },
  productBrand: {
    type: String,
    required: true,
  },
  productQuality: {
    type: String,
    required: true,
  },
  productCategory:{
    type: String,
    required: true,
  },
  productPrice: {
    type: String,
    required: true,
  },
  productStock: {
    type: String,
    required: true,
  },
  productDescription: {
    type: String,
    required: true,
  },
  productImageNames: {
    type: Array,
    required: true,
  },
  blocked: {
    type: Boolean,
    required: true,
  }
});

const productData = mongoose.model('productData', product);
module.exports = productData;