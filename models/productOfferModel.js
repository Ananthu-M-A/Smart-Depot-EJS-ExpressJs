const mongoose = require('mongoose');

const productOffer = mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'productData',
        required: true,
    },
    discount: { 
        type: Number, required: true 
    },
    startDate: { 
        type: String, required: true 
    },
    endDate: { 
        type: String, required: true 
    },
});

const productOfferData = mongoose.model('productOfferData',productOffer);
module.exports = productOfferData;