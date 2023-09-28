const mongoose = require('mongoose');

const category = mongoose.Schema({
  productCategory: {
    type: String,
    required: true,
    unique: true,
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


const categoryData = mongoose.model('categoryData', category);
module.exports = categoryData;