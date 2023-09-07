const mongoose = require('mongoose');

const wishlist = mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserLoginData',
        required: true,
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'productData',
        required: true,
        unique: true,
    },
});

wishlist.index({ customerId: 1, productId: 1 }, { unique: true });
const wishlistData = mongoose.model('wishlistData', wishlist);
module.exports = wishlistData;