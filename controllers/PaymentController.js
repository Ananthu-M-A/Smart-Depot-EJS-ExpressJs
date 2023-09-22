const crypto = require('crypto');
const razorpay = require('razorpay');
const orderData = require('../models/orderModel');

exports.createOrder = async (req,res)=>{
    try {
      const instance = new razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });
      
      const orderId = req.query.id;
      const order = await orderData.findOne({_id: orderId});
      let amount = order.total*100;
      const options = {
        amount: amount,
        currency: "INR",
        receipt: orderId,
      };
  
      instance.orders.create(options, function(error, order) {
        if(error)
        {
          console.log(error);
          return res.status(500).json({message:"Something went wrong!"});
        }
        res.render('index',{data:order});
        // res.status(200).json({data:order});
      });
    } catch (error) {
        res.status(500).json({message:"Internal Server Error!"});
    }
};

exports.verifyPayment =  async (req,res)=>{
    try {
      const razorpayPaymentId  = req.body.razorpay_payment_id;
      const razorpayOrderId  = req.body.razorpay_order_id;
      const razorpaySignature  = req.body.razorpay_signature;

      const sign = razorpayOrderId+"|"+razorpayPaymentId;
      const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");    
  
      if(razorpaySignature===expectedSign)
      {
        res.redirect(`/user/orderConfirmation?id=${razorpayPaymentId}`);
        // return res.status(200).json({message: "Payment Verified Successfully"});
      }else{
        return res.status(200).json({message: "Invalid Signature Sent"});
      }
      
    } catch (error) {
      console.log(error);
      res.status(500).json({message:"Internal Server Error!"});
    }
};
