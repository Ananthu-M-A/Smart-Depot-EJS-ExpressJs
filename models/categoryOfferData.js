const mongoose = require('mongoose');

const categoryOffer = mongoose.Schema({
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'categoryData',
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

const categoryOfferData = mongoose.model('categoryOfferData',categoryOffer);
module.exports = categoryOfferData;