let express = require('express');
let router = express.Router();
const productData = require('../models/productModel');
const categoryData = require('../models/categoryModel');
const cartData = require('../models/cartModel');
const addressData = require('../models/addressModel');
const UserLoginData = require('../models/userModel');
const orderData = require('../models/orderModel');
const wishlistData = require('../models/wishlistModel');
const requireAuth = require('../middlewares/isAuthenticatedUser');
const isUserBlocked = require('../middlewares/isUserBlocked');

router.get('/', requireAuth, isUserBlocked, async(req, res) => {
  try {
    const products = await productData.find(); 
    const categories = await categoryData.find();
    const countCart = await cartData.countDocuments({});
    const countWishlist = await wishlistData.countDocuments({});
    const users = await UserLoginData.findById(req.session.user);
    res.render('home', { user: req.session.user , products , categories , users , countCart , countWishlist }); 
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

router.get('/wishlist', requireAuth, async(req, res) => {
  try {
    const wishlist = await wishlistData.find({ customerId: req.session.user })
    .populate('productId') 
    .exec();  
    res.render('wishlist',{ user: req.session.user , wishlist }); 
  } catch (error) {
    res.render('wishlist', { error: 'Error fetching product data.' });
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

router.get('/orderDetail/:orderId', requireAuth, isUserBlocked, async(req, res) => {
  try {
    const userId =  req.session.user ;
    const orderId = req.params.orderId;
    const order = await orderData.findOne( { _id : orderId } );

    const products = await orderData.findById(orderId)
    .populate('products.productId').exec();

  if (!order) {
    return res.status(404).send('Order not found');
  }

    res.render('orderDetail', { user: userId , order , products } );
  } catch (error) {
    res.render('orderDetail', { error: 'Error fetching product data.' });
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
    const customerId = req.session.user;
    const productId = req.params.productId;
    const productQuantity = req.body.quantity;
    const products = await productData.findById(productId);
    const currentDate = new Date();

    const cartProduct = await cartData.findOne({ productId : productId });
    if( cartProduct && ( cartProduct.productId == productId ) )
    {
      const updatedQuantity = parseFloat(productQuantity) + parseFloat(cartProduct.productQuantity);
      const updatedProduct = { productQuantity : updatedQuantity };
      const result = await cartData.findByIdAndUpdate(cartProduct._id, updatedProduct , { new: true });
      if (!result) {
        return res.render('home', { error: 'Product not found.' });
      }
      res.redirect('/home/cart'); 
    }
    else{
    const cartItems = new cartData({
      customerId: customerId,
      productId: productId,
      productQuantity: productQuantity,
      productPrice: products.productPrice,
      createdTime: currentDate,
    });
    const result = await cartItems.save();
    res.redirect('/home/cart'); 
  }
  } catch (error) {
    res.render('cart', { error: 'Error fetching product data.' });
  }
});

router.post('/wishlist/:productId', requireAuth, async(req, res) => {
  try {
    customerId = req.session.user;
    const currentWishlist = await wishlistData.find({customerId : customerId});
    const productExisting = currentWishlist.some((item) => item.productId.equals(req.params.productId));
    if(productExisting)
    {
      res.redirect('/home/wishlist');
    }
    const wishlist = new wishlistData({
      customerId: req.session.user,
      productId: req.params.productId,
    });
    const result = await wishlist.save();
    res.redirect('/home/wishlist'); 
  } catch (error) {
    res.render('wishlist', { error: 'Error fetching product data.' });
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
      paymentMethod: req.body.payment,
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