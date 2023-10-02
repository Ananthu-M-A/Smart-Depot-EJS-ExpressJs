const mongoose = require('mongoose');

const couponOffer = mongoose.Schema({
  offerName: {
    type: String,
    required: true,
  },
  offerType: {
    type: String,
    required: true,
  },
  couponCode: {
    type: String,
    required: true,
  },
  hashedCouponCode: {
    type: String,
    required: true,
  },
  offerValue: {
    type: Number,
    required: true,
  },
  offerStart: {
    type: String,
    required: true,
  },
  offerEnd: {
    type: String,
    required: true,
  },
  offerStatus: {
    type: String,
    required: true,
  }
});


const couponOfferData = mongoose.model('couponOfferData', couponOffer);
module.exports = couponOfferData;