const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

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
  },
  offerName: {
    type: String,
  },
  offerType: {
    type: String,
  },
  offerValue: {
    type: Number,
  },
  offerStart: {
    type: String
  },
  offerEnd: {
    type: String,
  },
  offerStatus: {
    type: String,
  }
});

product.plugin(mongoosePaginate);

const productData = mongoose.model('productData', product);
module.exports = productData;