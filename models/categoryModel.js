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
  }
});


const categoryData = mongoose.model('categoryData', category);
module.exports = categoryData;