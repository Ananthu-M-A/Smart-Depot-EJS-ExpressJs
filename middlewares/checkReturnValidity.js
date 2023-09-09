const orderData = require('../models/orderModel');

const returnDays = 14;

const checkReturnValidity = async (req, res, next) => {
    try {
        const orders = await orderData.find({ userId: req.session.user });
        orders.forEach(order => {
            const currentDate = new Date();
            const daysDiff = (currentDate - order.orderDate) / (1000 * 60 * 60 * 24);
            if (daysDiff <= returnDays) {
                ////////////////////////////////
            }
            else {
                return res.status(403).json({ message: 'Return window has expired' });
            }
        })
    } catch (error) {
        return res.status(400).json({ message: 'Invalid date format in order' });
    }

};






module.exports = checkReturnValidity;


