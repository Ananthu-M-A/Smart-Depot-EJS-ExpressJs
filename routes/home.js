let express = require('express');
let router = express.Router();
const productData = require('../models/productModel');
const categoryData = require('../models/categoryModel');
const cartData = require('../models/cartModel');
const addressData = require('../models/addressModel');
const UserLoginData = require('../models/userModel');
const orderData = require('../models/orderModel');
const requireAuth = require('../middlewares/isAuthenticatedUser');
const isUserBlocked = require('../middlewares/isUserBlocked');

router.get('/', requireAuth, isUserBlocked, async(req, res) => {
  try {
    const products = await productData.find(); 
    const categories = await categoryData.find();
    const users = await UserLoginData.findById(req.session.user);
    res.render('home', { user: req.session.user , products , categories , users }); 
  } catch (error) {
    res.render('home', { error: 'Error fetching product data.' });
  }
});

router.get('/productDetails/:productId', requireAuth, async(req, res) => {
  try {
    const productId = req.params.productId;
    const fetchedProduct = await productData.findById(productId);
    res.render('productDetail', { user: req.session.user, product : fetchedProduct }); 
  } catch (error) {
    res.render('home', { error: 'Error fetching product data.' });
  }
});

router.get('/cart', requireAuth, isUserBlocked, async(req, res) => {
  try {
    const cartItems = await cartData.find({ customerId: req.session.user })
    .populate('productId') 
    .exec();  
    const productQuantity = req.body.quantity;
    res.render('cart' , { user: req.session.user , productQuantity , cartItems });
  } catch (error) {
    res.render('cart', { error: 'Error fetching product data.' });
  }
});

router.get('/orders', requireAuth, isUserBlocked, async(req, res) => {
  try {
    const userId =  req.session.user ;
    const orders = await orderData.find( { userId : userId } );
    res.render('order', { user: userId , orders: orders } );
  } catch (error) {
    res.render('order', { error: 'Error fetching product data.' });
  }
});

router.get('/account', requireAuth, isUserBlocked, async(req, res) => {
  try {
    const userId = req.session.user;
    const billAddress = await addressData.find({customerId: userId})
    const users = await UserLoginData.findById(userId);
    res.render('account',{ user: userId , users , billAddress });
  } catch (error) {
    res.render('account', { error: 'Error fetching product data.' });
  }
});


router.post('/saveAddress', requireAuth, async(req, res) => {
  try {
    const billAddress = new addressData({
      customerId: req.session.user,
      userFirstName: req.body.userFirstName,
      userLastName: req.body.userLastName,
      userEmail: req.body.userEmail,
      userMobileNo: req.body.userMobileNo,
      userAddressLine1: req.body.userAddressLine1,
      userAddressLine2: req.body.userAddressLine2,
      userCountry: req.body.userCountry,
      userCity: req.body.userCity,
      userState: req.body.userState,
      userZIP: req.body.userZIP,
    });
    const result = await billAddress.save();
    res.redirect('/home/account');
  } catch (error) {
    res.render('home', { error: 'Error fetching product data.' });
  }
});

router.post('/cart/:productId', requireAuth, async(req, res) => {
  try {
    const productId = req.params.productId;
    const customerId = req.session.user;
    const productQuantity = req.body.quantity;
    const products = await productData.findById(productId);
    const currentDate = new Date();
    const cartItems = new cartData({
      customerId: customerId,
      productId: productId,
      productQuantity: productQuantity,
      productPrice: products.productPrice,
      createdTime: currentDate,
    });
    const result = await cartItems.save();
    res.redirect('/home/cart'); 
  } catch (error) {
    res.render('cart', { error: 'Error fetching product data.' });
  }
});

router.post('/checkout/:subTotal/:total', requireAuth, async(req, res) => {
  try {
    const customerId = req.session.user;
    const address = await addressData.find( {customerId : customerId} );
    const subTotal = parseFloat(req.params.subTotal); 
    const total = parseFloat(req.params.total);
    const cartItems = await cartData.find({ customerId: customerId })
    .populate('productId') 
    .exec(); 
    res.render('checkout', {  user: customerId , address , cartItems , subTotal , total}); 
  } catch (error) {
    res.render('checkout', { error: 'Error fetching product data.' });
  }
});

router.post('/placeOrder/:subTotal/:total', requireAuth, async (req, res) => {
  try {
      const address = {
        userFirstName: req.body.userFirstName,
        userLastName: req.body.userLastName,
        userEmail: req.body.userEmail,
        userMobileNo: req.body.userMobileNo,
        userAddressLine1: req.body.userAddressLine1,
        userAddressLine2: req.body.userAddressLine2,
        userCountry: req.body.userCountry,
        userCity: req.body.userCity,
        userState: req.body.userState,
        userZIP: req.body.userZIP,
      };

    const subTotal = parseFloat(req.params.subTotal);
    const shippingFee = 10.00;
    const total = subTotal + shippingFee;

    const cartItems = await cartData.find({ customerId: req.session.user }).populate('productId').exec();
    const orderProducts = cartItems.map((cartItem) => ({
      productId: cartItem.productId._id,
      productQuantity: cartItem.productQuantity,
      productPrice: cartItem.productPrice
    }));

    const order = new orderData({
      userId: req.session.user,
      products: orderProducts,
      total: total,
      orderDate: new Date(),
      paymentMethod: 'COD',
      address: address,
    });

    const savedOrder = await order.save();
    const customerId = req.session.user;

    const clearCart = cartData.deleteMany({customerId: customerId});
    clearCart.then(result => {
      console.log(`Successfully deleted ${result.deletedCount} documents from the cart.`);
    });    
    res.render('orderConfirmation' , { user : customerId , savedOrder: savedOrder } );
  } catch (error) {
    console.log(error);
    res.redirect('/home');
  }
});


 
router.get('/logout', async(req, res) => {
  try {
    req.session.status = 'logged-out';
    req.session.destroy();
    res.redirect('/login');
  } catch (error) {
    res.render('login', { error: 'Error logging in' });
  }
});

module.exports = router;