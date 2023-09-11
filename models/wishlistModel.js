const mongoose = require('mongoose');

const wishlistSchema = mongoose.Schema({
  customerId: {
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
    },
  ],
});

const wishlistData = mongoose.model('wishlistData', wishlistSchema);
module.exports = wishlistData;
