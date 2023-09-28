const bcrypt = require('bcrypt');
const path = require('path');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const moment = require('moment');
const multer = require('multer');
const fs = require('fs');
const mongoose = require('mongoose');
const { ObjectId } = require('mongoose').Types;
const { error } = require('console');
const easyinvoice = require('easyinvoice');


const productData = require('../models/productModel');
const categoryData = require('../models/categoryModel');
const cartData = require('../models/cartModel');
const billingAddressData = require('../models/billingAddressModel');
const shippingAddressData = require('../models/shippingAddressModel');
const userLoginData = require('../models/userModel');
const wishlistData = require('../models/wishlistModel');
const orderData = require('../models/orderModel');

const networkTime = require('../middlewares/networkTime');

const transporter = require('../controllers/userOtpVerification');
const session = require('express-session');
const { log } = require('util');

async function getFilteredProducts(filter, page, itemsPerPage, req) {
  const startIndex = (page - 1) * itemsPerPage;

  const totalFilteredProducts = await productData.aggregate([
    { $match: filter },
    { $count: 'count' },
  ]);

  const count = totalFilteredProducts.length > 0 ? totalFilteredProducts[0].count : 0;

  const paginatedProducts = await productData.find(filter)
    .populate('productCategory')
    .skip(startIndex)
    .limit(itemsPerPage);

  const categories = await categoryData.find();
  const countCart = await cartData.countDocuments({ customerId: req.session.user });
  const countWishlist = await wishlistData.countDocuments({ customerId: req.session.user });
  const users = await userLoginData.findById(req.session.user);

  return {
    paginatedProducts,
    categories,
    users,
    countCart,
    countWishlist,
    totalPages: Math.ceil(count / itemsPerPage), // Calculate totalPages based on count
  };
}


function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

exports.loadSignupPage = (req, res) => {
  res.render('signup');
};

exports.signup = async (req, res) => {
  const { fullname, email, mobile, password } = req.body;
  const user = await userLoginData.findOne({ email });

  if (user) {
    return res.status(400).send('You already have an account');
  }

  const otp = generateOTP();

  req.session.userData = {
    fullname,
    email,
    mobile,
    password,
    otp,
  };

  try {
    const mailOptions = {
      from: 'smartdepot494@gmail.com',
      to: req.session.userData.email,
      subject: 'OTP Verification',
      text: `Your OTP is: ${otp}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending OTP email:', error);
      } else {
        console.log('OTP email sent:', info.response);
      }
    });
    res.redirect('/userSignup/verify-otp');
  } catch (error) {
    console.error('Error saving user:', error);
  }
};

exports.loadOtpPage = (req, res) => {
  res.render('verifyOtp');
};

exports.verifyOtp = async (req, res) => {
  const enteredOTP = req.body.otp;
  const storedUserData = req.session.userData;

  if (!storedUserData) {
    res.status(400).send('User data not found in session');
    return;
  }

  if (enteredOTP === storedUserData.otp) {
    const { fullname, email, mobile, password } = storedUserData;
    const hashedPassword = await bcrypt.hash(password, 10);

    const registerUserWithOTP = new userLoginData({
      fullname,
      email,
      mobile,
      password: hashedPassword,
    });

    try {
      await registerUserWithOTP.save();
      req.session.userData = null;

      res.render('login');
    } catch (error) {
      console.error('Error saving user:', error);
    }
  } else {
    req.session.userData = null;
    res.status(400).send('Invalid OTP');
  }
};

exports.loadLoginPage = async (req, res) => {
  try {
    if (!req.session.user || req.session.status !== 'logged-in') {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.render('login');
    } else {
      res.redirect('/user');
    }
  } catch (error) {
    res.render('login', { error: 'Error fetching product data.' });
  }
};

exports.loadForgotPasswordPage = async (req, res) => {
  try {
    res.render('forgotPassword');
  } catch (error) {
    res.render('login', { error: 'Error fetching product data.' });
  }
};

exports.forgotPassword = async (req, res, next) => {
  const { email } = req.body;
  const user = await userLoginData.findOne({ email });

  if (!user) {
    return res.status(400).send('User not found');
  }

  const otp = generateOTP();
  req.session.userData = { email, otp };

  try {
    const mailOptions = {
      from: 'smartdepot494@gmail.com',
      to: req.session.userData.email,
      subject: 'OTP Verification',
      text: `Your OTP is: ${otp}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending OTP email:', error);
      } else {
        console.log('OTP email sent:', info.response);
      }
    });
    res.redirect('/userLogin/verify-otp');
  } catch (error) {
    console.error('Error saving user:', error);
  }

};

exports.verifyOtpForgotPassword = async (req, res) => {
  const enteredOTP = req.body.otp;
  const storedUserData = req.session.userData;
  if (!storedUserData) {
    res.status(400).send('User data not found in session');
    return;
  }

  if (enteredOTP === storedUserData.otp) { res.render('addNewPassword'); }
  else {
    req.session.userData.otp = null;
    res.status(400).send('Invalid OTP');
  }
};

exports.addNewPassword = async (req, res) => {
  try {
    const storedUserData = req.session.userData;
    const email = storedUserData.email;
    const { password, confirmPassword } = req.body;
    if (password === confirmPassword) {
      const hashedPassword = await bcrypt.hash(password, 10);
      const updatePasswordWithOTP = await userLoginData.findOneAndUpdate({ email: email }, { password: hashedPassword });
      if (updatePasswordWithOTP.nModified !== 0) {
        req.session.userData = null;
        res.render('login');
      }
      else {
        res.redirect('/userLogin/forgotPassword')
      }
    }
  } catch (error) {
    console.error('Error saving user:', error);
  }
};

exports.login = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const user = await userLoginData.findOne({ email });

    if (!user) {
      return res.status(400).send('User not found');
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (passwordMatch) {
      req.session.user = user._id;
      req.session.status = 'logged-in';
      return res.redirect('/user');
    } else {
      return res.status(401).send('Enter correct password');
    }
  } catch (error) {
    console.error('Error during login:', error);
    return res.status(500).send('Internal server error');
  }
};

exports.loadHomePage = async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    const itemsPerPage = 4;
    const page = parseInt(req.query.page) || 1;
    const filter = req.session.filter || {};

    const { paginatedProducts, categories, users, countCart, countWishlist, totalPages } =
      await getFilteredProducts(filter, page, itemsPerPage, req);
    
    res.render('home', {
      user: req.session.user,
      products: paginatedProducts,
      categories,
      users,
      countCart,
      countWishlist,
      totalPages,
      currentPage: page,
    });

  } catch (error) {
    res.render('home', { error: 'Error fetching product data.' });
  }
};


exports.searchProducts = async (req, res) => {
  const query = req.query.searchInput;
  if (!query) {
    res.redirect('/user');
  }
  try {
    const products = await productData.find({
      $or: [
        { productName: { $regex: query, $options: 'i' } },
        { productBrand: { $regex: query, $options: 'i' } },
        { productQuality: { $regex: query, $options: 'i' } },
        { productDescription: { $regex: query, $options: 'i' } },
        // {
        //   productCategory: {
        //     $in: await productData.distinct('_id', {
        //       productCategory: { $regex: query, $options: 'i' },
        //     }),
        //   },
        // },
        {
          productPrice: { $eq: parseFloat(query) }, // Assuming query is a string representing a number
        },
      ],
    }).populate('productCategory');


    const categories = await categoryData.find();
    const countCart = await cartData.find({ customerId: req.session.user }).countDocuments({});
    const countWishlist = await wishlistData.findOne({ customerId: req.session.user }).countDocuments({});

    const users = await userLoginData.findById(req.session.user);

    res.render('home', { user: req.session.user, products, categories, users, countCart, countWishlist, totalPages: 4, currentPage: 1 });
  } catch (error) {
    res.render('home', { error: 'Error searching products.' });
  }
};

exports.filterProducts = async (req, res) => {
  try {
    const categoryNames = req.body.category || [];
    const minPriceRange = parseInt(req.body.minPriceRange);
    const maxPriceRange = parseInt(req.body.maxPriceRange);

    req.session.filter = {
      categories: categoryNames,
      minPrice: minPriceRange,
      maxPrice: maxPriceRange,
    };


    const filter = {};

    if (categoryNames.length > 0) {
      const categoryIds = await categoryData.find({ productCategory: { $in: categoryNames } }).distinct('_id');
      filter.productCategory = { $in: categoryIds };
    }

    if (!isNaN(minPriceRange) && !isNaN(maxPriceRange)) {
      filter.productPrice = { $gte: minPriceRange, $lte: maxPriceRange };
    }

    const itemsPerPage = 4;
    const page = parseInt(req.query.page) || 1;

    const {
      paginatedProducts,
      categories,
      users,
      countCart,
      countWishlist,
      productOffer,
      categoryOffer,
      totalPages,
    } = await getFilteredProducts(filter, page, itemsPerPage, req);
    
    res.render('home', {
      user: req.session.user,
      products: paginatedProducts,
      categories,
      users,
      countCart,
      countWishlist,
      totalPages,
      currentPage: page,
      productOffer,
      categoryOffer,
    });

  } catch (error) {
    res.render('home', { error: 'Error fetching product data.' });
  }
};

exports.clearFilter = async (req, res) => {
  try {

    req.session.filter = {
      categories: [],
      minPrice: 0,
      maxPrice: 10000,
    };
    res.redirect('/user')
  } catch (error) {
    console.log(error);
  }

};


exports.loadProductDetail = async (req, res) => {
  try {
    const countCart = await cartData.find({ customerId: req.session.user }).countDocuments({});
    const countWishlist = await wishlistData.findOne({ customerId: req.session.user }).countDocuments({});
    const user = await userLoginData.findById(req.session.user ,{offerApplied: 1, _id: 0});
    let offer;
    const productId = req.query.productId;
    const categoryId = req.query.categoryId;
    const fetchedProduct = await productData.findById(productId).populate('productCategory');
    if(user.offerApplied === true){
      offer = 0;
    } else if(fetchedProduct.offerStatus === "Active"){
      offer = fetchedProduct.offerValue;
    } else if(fetchedProduct.productCategory.offerStatus === "Active") {
      offer = fetchedProduct.productCategory.offerValue;
    } else {
      offer = 0;
    }
    const users = await userLoginData.findById(req.session.user);

    res.render('productDetail', { user: req.session.user, product: fetchedProduct, countCart, countWishlist, users , offer });
  } catch (error) {
    res.render('home', { error: 'Error fetching product data.' });
  }
};

exports.loadCart = async (req, res) => {
  try {
    const countCart = await cartData.find({ customerId: req.session.user }).countDocuments({});
    const countWishlist = await wishlistData.findOne({ customerId: req.session.user }).countDocuments({});
    const cartItems = await cartData.find({ customerId: req.session.user })
      .populate('productId')
      .populate('categoryId')
      .populate('customerId')
      .exec();
    const categories = await categoryData.find({ offerStatus: "Active" });
    const productQuantity = req.body.quantity;
    const users = await userLoginData.findById(req.session.user);
    res.render('cart', { user: req.session.user, productQuantity, cartItems, countCart, countWishlist, users, categories });
  } catch (error) {
    res.render('cart', { error: 'Error fetching product data.' });
  }
};

exports.removeCartItem = async (req, res) => {
  try {
    const productId = req.params.productId;
    const customerId = req.session.user;
    const result = await cartData.findOneAndRemove({ productId, customerId: customerId });
    res.redirect('/user/cart')
  } catch (error) {
    res.render('cart', { error: 'Error fetching product data.' });
  }
};

exports.loadWishlist = async (req, res) => {
  try {
    const customerId = req.session.user;
    const wishlist = await wishlistData.find({ customerId: customerId }).populate('product');
    const countCart = await cartData.find({ customerId }).countDocuments({});
    const countWishlist = await wishlistData.findOne({ customerId: req.session.user }).countDocuments({});
    const users = await userLoginData.findById(customerId);
    
    res.render('wishlist', { user: customerId, wishlist, countCart, countWishlist, users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.removeWishlistItem = async (req, res) => {
  try {
    const productId = req.params.productId;
    const customerId = req.session.user;

    const result = await wishlistData.deleteOne({ customerId: customerId });

    // const result = await wishlistData.findOneAndUpdate(
    //   { customerId },
    //   { $pull: { products: productId } },
    //   { new: true }
    // );

    res.redirect('/user/wishlist');
  } catch (error) {
    res.render('cart', { error: 'Error removing product from the wishlist.' });
  }
};

exports.loadOrders = async (req, res) => {
  try {
    const countCart = await cartData.find({ customerId: req.session.user }).countDocuments({});
    const countWishlist = await wishlistData.findOne({ customerId: req.session.user }).countDocuments({});

    const userId = req.session.user;
    const orders = await orderData.find({ userId: userId });

    for (const order of orders) {
      const currentDate = new Date(moment(networkTime.date));
      const date = new Date(order.deliveredDate);
      const daysDiff = (currentDate - date) / (1000 * 60 * 60 * 24);
      if (daysDiff > 14) {
        const result = await orderData.findOneAndUpdate({ _id: order._id }, { orderStatus: "Order Closed", returnOption: false }, { new: true });
        if (!result) {
          return res.status(404).json({ message: 'Order status not updated' });
        }
      }
    }
    const users = await userLoginData.findById(userId);
    
    orderData.find().sort({ orderDate: -1 }).exec()
      .then((orders) => {
        res.render('order', { user: userId, orders: orders, countCart, countWishlist, users });
      })
      .catch((err) => {
        console.error('Error loading orders:', err);
      });

  } catch (error) {
    res.render('order', { error: 'Error loading product data.' });
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const countCart = await cartData.find({ customerId: req.session.user }).countDocuments({});
    const countWishlist = await wishlistData.findOne({ customerId: req.session.user }).countDocuments({});

    const userId = req.session.user;
    const orderId = req.params.orderId;
    const updatedOrder = { orderStatus: "Order Cancelled" };
    const result = await orderData.findByIdAndUpdate(orderId, updatedOrder, { new: true });
    const orders = await orderData.find({ userId: userId });
    res.render('order', { user: userId, orders: orders, countCart, countWishlist });
  } catch (error) {
    res.render('order', { error: 'Error fetching product data.' });
  }
};

exports.returnOrder = async (req, res) => {
  try {
    const countCart = await cartData.find({ customerId: req.session.user }).countDocuments({});
    const countWishlist = await wishlistData.findOne({ customerId: req.session.user }).countDocuments({});

    const userId = req.session.user;
    const orderId = req.params.orderId;
    const updatedOrder = { orderStatus: "Return Initiated" };
    const result = await orderData.findByIdAndUpdate(orderId, updatedOrder, { new: true });
    const orders = await orderData.find({ userId: userId });
    res.render('order', { user: userId, orders: orders, countCart, countWishlist });
  } catch (error) {
    res.render('order', { error: 'Error fetching product data.' });
  }
};

exports.loadOrderDetail = async (req, res) => {
  try {
    const customerId = req.session.user;
    const countCart = await cartData.find({ customerId: customerId }).countDocuments({});
    const countWishlist = await wishlistData.findOne({ customerId: customerId }).countDocuments({});
    const orderId = req.params.orderId;
    const users = await userLoginData.findById(customerId);
    const order = await orderData.findById(orderId)
    .populate('userId')
    .populate('products.productId')
    .populate('billingAddress')
    .populate('shippingAddress')
    .exec();


    if (!order) {
      return res.status(404).send('Order not found');
    }

    res.render('orderDetail', { user: customerId, order, countCart, countWishlist, users});
  } catch (error) {
    console.log(error);
    res.render('orderDetail', { error: 'Error fetching product data.' });
  }
};

exports.loadAccount = async (req, res) => {
  try {
    const customerId = req.session.user;
    const countCart = await cartData.find({ customerId: customerId }).countDocuments({});
    const countWishlist = await wishlistData.findOne({ customerId: customerId }).countDocuments({});

    const billingAddress = await billingAddressData.findOne({customerId: customerId});
    const shippingAddress = await shippingAddressData.findOne({customerId: customerId});
    const users = await userLoginData.findById(customerId);

    res.render('account', { user: customerId, users, countCart, countWishlist, billingAddress, shippingAddress });
  } catch (error) {
    res.render('account', { error: 'Error fetching product data.' });
  }
};

exports.updateLoginData = async (req, res) => {
  try {
    const customerId = req.session.user;
    const imageName = req.file.filename;
    if(!imageName)
    { imageName = undefined; }
    const userData = {
      fullName: req.body.userName,
      mobile: req.body.userMobileNo,
      profileImageName: imageName,
    }
    if(userData){
      await userLoginData.findByIdAndUpdate(customerId, userData, {upsert: true} );
    }

    res.redirect('/user/account');
  } catch (error) {
    console.log(error);
    res.render('home', { error: 'Error fetching product data.' });
  }
};

exports.addBillingAddress = async (req, res) => {
  try {
    const customerId = req.session.user;
    const billingAddressId = await billingAddressData.findOne({ customerId: customerId }, { _id: 1 });
    const billingAddress = new billingAddressData({
      customerId: customerId,
      alternateMobileNo: req.body.alternateMobileNo,
      userAddressLine1: req.body.userAddressLine1,
      userAddressLine2: req.body.userAddressLine2,
      userCountry: req.body.userCountry,
      userCity: req.body.userCity,
      userState: req.body.userState,
      userZIP: req.body.userZIP,
    });
    if(billingAddress)
    {
      // await billingAddressData.findByIdAndUpdate(billingAddressId, billingAddress, {upsert: true});
      await billingAddress.save();
    }
    res.redirect('/user/account');
  } catch (error) {
    console.log(error);
    res.render('home', { error: 'Error fetching product data.' });
  }
}

exports.updateBillingAddress = async (req, res) => {
  try {
    const customerId = req.session.user;
    const billingAddressId = await billingAddressData.findOne({ customerId: customerId }, { _id: 1 });
    const billingAddress = {
      alternateMobileNo: req.body.alternateMobileNo,
      userAddressLine1: req.body.userAddressLine1,
      userAddressLine2: req.body.userAddressLine2,
      userCountry: req.body.userCountry,
      userCity: req.body.userCity,
      userState: req.body.userState,
      userZIP: req.body.userZIP,
    };
    if(billingAddress)
    {
      await billingAddressData.findByIdAndUpdate(billingAddressId, billingAddress);
    }
    res.redirect('/user/account');
  } catch (error) {
    console.log(error);
    res.render('home', { error: 'Error fetching product data.' });
  }
}

exports.addShippingAddress = async (req, res) => {
  try {
    const customerId = req.session.user;
    const shippingAddressId = await shippingAddressData.findOne({ customerId: customerId }, { _id: 1 });
    const shippingAddress = new shippingAddressData({
      customerId: customerId,
      altName: req.body.userName2,
      altEmail: req.body.userEmail2,
      altMobileNo: req.body.alternateMobileNo2,
      altAddressLine1: req.body.userAddressLine12,
      altAddressLine2: req.body.userAddressLine22,
      altCountry: req.body.userCountry2,
      altCity: req.body.userCity2,
      altState: req.body.userState2,
      altZIP: req.body.userZIP2,
    });
    if(shippingAddress)
    {
      // await shippingAddressData.findByIdAndUpdate(shippingAddressId, shippingAddress, {upsert: true});
      await shippingAddress.save();
    }
    res.redirect('/user/account');
  } catch (error) {
    console.log(error);
    res.render('home', { error: 'Error fetching product data.' });
  }
}

exports.updateShippingAddress = async (req, res) => {
  try {
    const customerId = req.session.user;
    const shippingAddressId = await shippingAddressData.findOne({ customerId: customerId }, { _id: 1 });
    const shippingAddress = {
      altName: req.body.userName2,
      altEmail: req.body.userEmail2,
      altMobileNo: req.body.alternateMobileNo2,
      altAddressLine1: req.body.userAddressLine12,
      altAddressLine2: req.body.userAddressLine22,
      altCountry: req.body.userCountry2,
      altCity: req.body.userCity2,
      altState: req.body.userState2,
      altZIP: req.body.userZIP2,
    };
    if(shippingAddress)
    {
      await shippingAddressData.findByIdAndUpdate(shippingAddressId, shippingAddress);
    }
    res.redirect('/user/account');
  } catch (error) {
    console.log(error);
    res.render('home', { error: 'Error fetching product data.' });
  }
}

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, newPassword2 } = req.body;
    if (newPassword !== newPassword2) {
      console.log('Incorrect password');
      return res.redirect('/user/account');
    }

    const customerId = req.session.user;
    const user = await userLoginData.findOne({ _id: customerId }, { password: 1 });
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);

    if (passwordMatch) {
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      const updatePassword = await userLoginData.findOneAndUpdate({ _id: customerId }, { password: hashedNewPassword });

      if (updatePassword.nModified !== 0) {
        return res.redirect('/user/account');
      } else {
        res.redirect('/user/logout');
      }
    } else {
      res.redirect('/user/logout');
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};



exports.deleteAccount = async (req, res) => {
  try {
    const { userEmail, currentPassword } = req.body;
    const user = await userLoginData.findOne({ email: userEmail }, { password: 1 });
    if (!user) {
      res.redirect('/user/logout');
    }
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (passwordMatch) {
      const deleteAccount = await userLoginData.deleteOne({ email: userEmail });
      res.redirect('/userSignup')
    } else {
      res.redirect('/user/logout');
    }
  } catch (error) {
    console.log(error);
  }
};

exports.addToCart = async (req, res) => {
  try {
    const customerId = req.session.user;
    const productId = req.params.productId;
    const productQuantity = req.body.quantity;
    const products = await productData.findById(productId);
    const currentDate = moment(networkTime.date).format('YYYY-MM-DD HH:mm:ss');

    const cartProduct = await cartData.findOne({
      customerId: customerId,
      productId: productId,
    }); 

    if (cartProduct) {
      const updatedQuantity = parseFloat(productQuantity) + parseFloat(cartProduct.productQuantity);
      const updatedProduct = { productQuantity: updatedQuantity };
      const result = await cartData.findByIdAndUpdate(cartProduct._id, updatedProduct, { new: true });
      if (!result) {
        return res.render('home', { error: 'Product not found.' });
      }
      res.redirect('/user/cart');
    } else {
      const cartItems = new cartData({
        customerId: customerId,
        productId: productId,
        categoryId: products.productCategory,
        productQuantity: productQuantity,
        productPrice: products.productPrice,
        createdTime: currentDate,
      });
      const result = await cartItems.save();
      res.redirect('/user/cart');
    }
  } catch (error) {
    console.error('Error adding product to cart: ', error);
    res.render('cart', { error: 'Error adding product to cart.' });
  }
};

exports.changeQuantity = async (req, res) => {
  try {
    const customerId = req.session.user;
    const { productId, productQuantity } = req.params;

    if (parseFloat(productQuantity) < 1) {
      res.redirect('/user/cart');
    }

    const products = await productData.findById(productId);
    const currentDate = moment(networkTime.date).format('YYYY-MM-DD HH:mm:ss');

    const cartProduct = await cartData.findOne({
      customerId: customerId,
      productId: productId
    });

    if (cartProduct) {
      const updatedQuantity = parseFloat(productQuantity);
      if (updatedQuantity >= 0) {
        res.redirect('/user/cart');
      }

      const updatedProduct = { productQuantity: updatedQuantity };
      const result = await cartData.findByIdAndUpdate(cartProduct._id, updatedProduct, { new: true });
      if (!result) {
        return res.render('home', { error: 'Product not found.' });
      }
      res.redirect('/user/cart');
    } else {
      const cartItems = new cartData({
        customerId: customerId,
        productId: productId,
        productQuantity: productQuantity,
        productPrice: products.productPrice,
        createdTime: currentDate,
      });
      const result = await cartItems.save();
      res.redirect('/user/cart');
    }
  } catch (error) {
    console.error('Error adding product to cart: ', error);
    res.render('cart', { error: 'Error adding product to cart.' });
  }
};

exports.addToWishlist = async (req, res) => {
  try {
    let customerId = req.session.user;
    const productId = req.params.productId;

    const wishlist = await wishlistData.findOne({ customerId: customerId });

    if (!wishlist) {
      console.log('wishlist not exists');
      const newWishlist = new wishlistData({
        customerId: customerId,
        product: productId,
      });
      await newWishlist.save();
      res.redirect('/user/wishlist');
    } else {
      if (wishlist.product.equals(productId)) {
        console.log('product already exists in wishlist');
        res.redirect('/user/wishlist');
      } else {
        console.log('user exists, but product does not');
        wishlist.product = productId;
        await wishlist.save();
        res.redirect('/user/wishlist');
      }
    }
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.loadCheckout = async (req, res) => {
  try {
    const countCart = await cartData.find({ customerId: req.session.user }).countDocuments({});
    const countWishlist = await wishlistData.findOne({ customerId: req.session.user }).countDocuments({});

    const customerId = req.session.user;
    const billingAddress = await billingAddressData.find({customerId: customerId})
    .populate('customerId').exec();
    const shippingAddress = await shippingAddressData.find({customerId: customerId})
    .populate('customerId').exec();


    const subTotal = parseFloat(req.params.subTotal);
    const total = parseFloat(req.params.total);
    const users = await userLoginData.findById(customerId);
    const cartItems = await cartData.find({ customerId: customerId })
      .populate('productId')
      .populate('categoryId')
      .populate('customerId')
      .exec();
    res.render('checkout', { user: customerId, users, billingAddress, shippingAddress, cartItems, subTotal, total, countCart, countWishlist });
  } catch (error) {
    res.render('checkout', { error: 'Error fetching product data.' });
  }
};

exports.updateReturnStatus = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const result1 = await orderData.findByIdAndUpdate(orderId, { orderStatus: "Return Initiated" });
    const result2 = await orderData.findByIdAndUpdate(orderId, { returnOption: false });

    if (result1.nModified === 0) {
      return res.status(404).json({ message: 'Order status not updated' });
    }
    if (result2.nModified === 0) {
      return res.status(404).json({ message: 'Return option not updated' });
    }
    res.redirect('/user/orders');
  } catch (error) {
    res.status(500).json({ message: 'Error updating order status', error: error.message });
  }
};

exports.placeOrder = async (req, res) => {
  try {
    const currentDate = moment(networkTime.date).format('YYYY-MM-DD HH:mm:ss');
    const subTotal = parseFloat(req.params.subTotal);
    const discount = 0.00;
    const total = subTotal + discount;

    const cartItems = await cartData.find({ customerId: req.session.user })
    .populate('productId')
    .populate('categoryId')
    .populate('customerId')
    .exec();
    
    const orderProducts = cartItems.map((cartItem) => {
      let offerName, offerValue;
      if(cartItem.customerId.offerApplied === true)
      {
        offerName = "No Offer Applied";
        offerValue = 0;
      }
      else if(cartItem.productId.offerStatus === "Active")
      { offerName = cartItem.productId.offerName;
        offerValue = cartItem.productId.offerValue;
      }
      else if(cartItem.categoryId.offerStatus === "Active")
      { offerName = cartItem.categoryId.offerName; 
        offerValue = cartItem.categoryId.offerValue;
      }
      else
      { 
        offerName = "No Offer Applied";
        offerValue = 0;
      }
      
      let offerPrice = cartItem.productPrice - (cartItem.productPrice * (offerValue / 100)) || cartItem.productPrice;

      return {
        productId: cartItem.productId._id,
        productQuantity: cartItem.productQuantity,
        productPrice: cartItem.productPrice,
        offerName: offerName,
        offerPrice: offerPrice,
      };
    });

    const order = new orderData({
      userId: req.session.user,
      products: orderProducts,
      total: total,
      orderDate: currentDate,
      paymentMethod: req.body.paymentMethod,
      billingAddress:req.body.billingAddress,
      shippingAddress:req.body.shippingAddress,
      paymentStatus: false,
    });

    const savedOrder = await order.save();
    req.session.orderId = savedOrder._id;
    if (req.body.paymentMethod === "Online") {
      req.session.paymentMethod = "Online";
      res.redirect(`/payment/createOrder?id=${savedOrder._id}`);
    }
    else {
      req.session.paymentMethod = "COD";
      res.redirect(`/user/orderConfirmation?id=${savedOrder._id}`);
    }

  } catch (error) {
    console.log(error);
    res.redirect('/user');
  }
};

exports.loadOrderConfirmation = async (req, res) => {
  try {
    const orderId = req.session.orderId;
    const customerId = req.session.user;
    const countCart = await cartData.countDocuments({ customerId: customerId });
    const users = await userLoginData.findById(customerId);
    const billingAddress =await billingAddressData.findOne({customerId: customerId});
    const shippingAddress =await shippingAddressData.findOne({customerId: customerId});

    const clearCartResult = await cartData.deleteMany({ customerId: customerId });
    console.log(`Successfully deleted ${clearCartResult.deletedCount} documents from the cart.`);
    const countWishlist = await wishlistData.countDocuments({ customerId: customerId });
    const currentDate = moment(networkTime.date).format('YYYY-MM-DD');

    const offerApplied = await userLoginData.findByIdAndUpdate(customerId,{offerApplied: true, offerAppliedDate: currentDate},{upsert:true});

    if (req.session.paymentMethod === "Online") {
      const paymentId = req.query.id;

      const updatedOrder = await orderData.findByIdAndUpdate(orderId, {
        paymentStatus: true,
        paymentId: paymentId,
      });

      if (!updatedOrder) {
        throw new Error('Order not found');
      }
    }

    res.render('orderConfirmation', {
      user: customerId,
      orderId,
      countCart,
      countWishlist,
      billingAddress,
      shippingAddress,
      users,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};

exports.logout = async (req, res) => {
  try {
    req.session.status = 'logged-out';
    req.session.destroy();
    res.redirect('/userLogin');
  } catch (error) {
    res.render('login', { error: 'Error logging in' });
  }
};

exports.downloadInvoice = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await orderData.findById(orderId)
    .populate('userId')
    .populate('products.productId')
    .populate('billingAddress')
    .populate('shippingAddress')
    .exec();

    const currentDate = moment(networkTime.date).format('YYYY-MM-DD HH:mm:ss');
    const products = order.products.map((product) => ({
      "quantity": product.productQuantity,
      "description": product.productId.productName,
      "tax-rate": 0,
      "price": product.offerPrice || product.productPrice,
    }));
    let totalPrice = 0;
    order.products.forEach((product) => {
      totalPrice += (product.offerPrice || product.productPrice) * product.productQuantity;
    });
    let total = totalPrice.toString();

    let data = {
      "documentTitle": "RECEIPT",
      "locale": "en-US",
      "currency": "INR",
      "marginTop": 25,
      "marginRight": 25,
      "marginLeft": 25,
      "marginBottom": 25,
      "logo": "D:\Projects\Smart-Depot\public\images\smart-depot1.png",
      "background": "https://public.easyinvoice.cloud/img/watermark-draft.jpg",
      "sender": {
        "company": "SMART DEPOT",
        "address": "Park Centre, SM Street",
        "zip": "LIC, Mananchira",
        "city": "Kozhikode",
        "country": "India - 444444"
      },
      "client": {
        "company": order.userId.fullname,
        "address": order.billingAddress.userAddressLine1 +", "+ order.billingAddress.userAddressLine2,
        "city": order.billingAddress.userState,
        "country": "India - "+ order.billingAddress.userZIP,
        "zip": order.billingAddress.userCity,
      },
      "information": {
        "number": orderId,
        "date": currentDate,
        "due-date": "Nil",
      },
      "products": products,
      "total": total,
      "bottomNotice": "Kindly pay your invoice within 15 days.",
      "vat": 0,
      "vatPercentage": 0,
    };

    let filePath = 'C:/Users/anant/Downloads/invoice.pdf';

    easyinvoice.createInvoice(data, function (result) {
      const pdf = result.pdf;
    
      if (!pdf) {
        console.error('PDF data is empty');
        res.status(500).send('Error: Empty PDF data');
        return;
      }
  
      // Write the decoded PDF data to the specified file path
      fs.writeFile(filePath, Buffer.from(pdf, 'base64'), function (err) {
        if (err) {
          console.error('Error while saving the PDF:', err);
          res.status(500).send('Error while generating the invoice');
        } else {
          console.log('PDF saved as', filePath);
    
          // Send the PDF for download
          res.download(filePath, 'invoice.pdf', function (err) {
            if (err) {
              console.error('Error while sending the PDF:', err);
              res.status(500).send('Error while sending the PDF for download');
            } else {
              console.log('PDF sent for download');
            }
          });
        }
      });
    });  
  } catch (err) { // Add the 'err' parameter here
    console.error('Error:', err);
    res.status(500).send('An error occurred');
  }  
}
