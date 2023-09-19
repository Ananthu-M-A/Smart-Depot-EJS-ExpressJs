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
  productCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'categoryData',
    required: true,
  },
  productPrice: {
    type: Number,
    required: true,
  },
  productStock: {
    type: Number,
    required: true,
  },
  productDescription: {
    type: String,
    required: true,
  },
  productImageNames: {
    type: [String],
    required: true,
  },
  blocked: {
    type: Boolean,
    required: true,
  }
});

const productData = mongoose.model('productData', product);
module.exports = productData;