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


const productData = require('../models/productModel');
const categoryData = require('../models/categoryModel');
const cartData = require('../models/cartModel');
const addressData = require('../models/addressModel');
const UserLoginData = require('../models/userModel');
const wishlistData = require('../models/wishlistModel');
const orderData = require('../models/orderModel');


const networkTime = require('../middlewares/networkTime');

const transporter = require('../controllers/userOtpVerification');

  
async function getFilteredProducts(filter, page, itemsPerPage, req) {
    const startIndex = (page - 1) * itemsPerPage;
    const totalFilteredProducts = await productData.countDocuments(filter);
  
    const paginatedProducts = await productData.find(filter)
      .populate('productCategory')
      .skip(startIndex)
      .limit(itemsPerPage);
  
    const categories = await categoryData.find();
    const countCart = await cartData.find({ customerId: req.session.user }).countDocuments({});
    const countWishlist = await wishlistData.findOne({ customerId: req.session.user }).countDocuments({});
    const users = await UserLoginData.findById(req.session.user);
  
    return {
      paginatedProducts,
      categories,
      users,
      countCart,
      countWishlist,
      totalPages: Math.ceil(totalFilteredProducts / itemsPerPage),
    };
}


function generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
}

exports.loadSignupPage = (req, res) => {
    res.render('signup');
};

exports.signup = async(req,res)=>{
    const { fullname, email, mobile, password } = req.body;
    const user = await UserLoginData.findOne({ email });
  
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

exports.loadOtpPage = (req,res)=>{
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
  
      const registerUserWithOTP = new UserLoginData({
        fullname,
        email,
        mobile,
        password: hashedPassword,
        blocked: false,
      });
  
      try {
        await registerUserWithOTP.save();
        req.session.userData = null;
        console.log(registerUserWithOTP._id);
  
        const address = new addressData({
          customerId: registerUserWithOTP._id,
          userName: fullname,
          userEmail: email,
          userMobileNo: mobile,
          alternateMobileNo: "Nil",
          userAddressLine1: "Nil",
          userAddressLine2: "Nil",
          userCountry: "Nil",
          userCity: "Nil",
          userState: "Nil",
          userZIP: "Nil",
        });
        const result = await address.save();
  
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

  exports.loadForgotPasswordPage =  async (req, res) => {
    try {
      res.render('forgotPassword');
    } catch (error) {
      res.render('login', { error: 'Error fetching product data.' });
    }
};
  
exports.forgotPassword =  async (req, res, next) => {
    const { email } = req.body;
    const user = await UserLoginData.findOne({ email });
  
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
  
    if (enteredOTP === storedUserData.otp) 
    { res.render('addNewPassword'); }
    else {
    req.session.userData.otp = null;
    res.status(400).send('Invalid OTP');  
    }
};

exports.addNewPassword =  async (req, res) => {
    try {
      const storedUserData = req.session.userData;
      const email = storedUserData.email;
      const { password, confirmPassword } = req.body;
      if (password === confirmPassword) {
        const hashedPassword = await bcrypt.hash(password, 10);
        const updatePasswordWithOTP = await UserLoginData.findOneAndUpdate({ email: email }, { password: hashedPassword });
        if (updatePasswordWithOTP.nModified !== 0) {
          req.session.userData = null;
          res.render('login');
        }
        else
        {
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
      const user = await UserLoginData.findOne({ email });
  
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
      const filter = {};
  
      const { paginatedProducts, categories, users, countCart, countWishlist, totalPages } =
        await getFilteredProducts(filter, page, itemsPerPage, req);
  
      const address = await addressData.findOne({ customerId: req.session.user });
  
      res.render('home', {
        user: req.session.user,
        products: paginatedProducts,
        categories,
        users,
        countCart,
        countWishlist,
        totalPages,
        currentPage: page,
        address,
      });
  
    } catch (error) {
      res.render('home', { error: 'Error fetching product data.' });
    }
};
  
exports.searchProducts = async (req, res) => {
    const query = req.query.searchInput;
    console.log(query);
    if (!query) {
      res.redirect('/user');
    }
    try {
      const products = await productData.find({
        $or: [
          { productName: { $regex: query, $options: 'i' } },
          { productBrand: { $regex: query, $options: 'i' } },
          { productQuality: { $regex: query, $options: 'i' } },
          { productCategory: { $regex: query, $options: 'i' } },
          { productPrice: { $regex: query, $options: 'i' } },
          { productDescription: { $regex: query, $options: 'i' } },
        ]
      });
      console.log(products);
      const categories = await categoryData.find();
      console.log(categories);
      const countCart = await cartData.find({ customerId: req.session.user }).countDocuments({});
      const countWishlist = await wishlistData.findOne({ customerId: req.session.user }).countDocuments({});
      console.log(countCart,countWishlist);
  
      const users = await UserLoginData.findById(req.session.user);
      console.log(users);
      
      res.render('home', { user: req.session.user, products, categories, users, countCart, countWishlist });
    } catch (error) {
      res.render('home', { error: 'Error searching products.' });
    }
};

exports.filterProducts = async (req, res) => {
  try {
      const categoryNames = req.body.category || []; // Use an empty array if no categories are provided
      const priceRanges = req.body.priceRange || []; // Use an empty array if no price ranges are provided

      const filter = {};

      if (categoryNames.length > 0) {
          const categoryIds = await categoryData.find({ productCategory: { $in: categoryNames } }).distinct('_id');
          filter.productCategory = { $in: categoryIds };
      }else{
        console.log('no category');
      }
      
      if (priceRanges.length > 0) {
          const priceFilters = [];
          priceRanges.forEach(priceRange => {
              const [minPrice, maxPrice] = priceRange.split('-');
              if (maxPrice === undefined && minPrice == 500) {
                  priceFilters.push({ productPriceRange: { $lte: parseInt(minPrice) } });
              } else if (maxPrice === undefined && minPrice == 5000) {
                  priceFilters.push({ productPriceRange: { $gte: parseInt(minPrice) } });
              } else {
                  priceFilters.push({ productPriceRange: { $gte: parseInt(minPrice), $lte: parseInt(maxPrice) } });
              }
              console.log(priceRanges);
          });
          filter.$or = priceFilters;
      }
      else{
        console.log('no price');
      }
      console.log(filter);

      const itemsPerPage = 4;
      const page = parseInt(req.query.page) || 1;

      const {
          paginatedProducts,
          categories,
          users,
          countCart,
          countWishlist,
          totalPages,
      } = await getFilteredProducts(filter, page, itemsPerPage, req);
      const address = await addressData.findOne({ customerId: req.session.user });

      res.render('home', {
          user: req.session.user,
          products: paginatedProducts,
          categories,
          users,
          countCart,
          countWishlist,
          totalPages,
          address,
          currentPage: 1
      });

  } catch (error) {
      res.render('home', { error: 'Error fetching product data.' });
  }
};


exports.loadProductDetail = async (req, res) => {
    try {
      const countCart = await cartData.find({ customerId: req.session.user }).countDocuments({});
      const countWishlist = await wishlistData.findOne({ customerId: req.session.user }).countDocuments({});
  
      const productId = req.params.productId;
      const fetchedProduct = await productData.findById(productId);
      const address = await addressData.findOne({customerId:req.session.user});
      res.render('productDetail', { user: req.session.user, product: fetchedProduct, countCart, countWishlist, address });
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
        .exec();
      const productQuantity = req.body.quantity;
      const address = await addressData.findOne({customerId:req.session.user});
      res.render('cart', { user: req.session.user, productQuantity, cartItems, countCart, countWishlist, address });
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
      const address = await addressData.findOne({customerId:req.session.user});
  
      res.render('wishlist', { user: customerId, wishlist, countCart, countWishlist, address });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.removeWishlistItem = async (req, res) => {
    try {
      const productId = req.params.productId;
      const customerId = req.session.user;
      console.log(productId,customerId);
  
      const result = await wishlistData.deleteOne({customerId: customerId});
  
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
        const date =  new Date(order.deliveredDate);
        const daysDiff = (currentDate - date) / (1000 * 60 * 60 * 24);
        if (daysDiff > 14) {
          const result = await orderData.findOneAndUpdate({ _id: order._id }, { orderStatus: "Order Closed", returnOption: false }, { new: true });
          if (!result) {
            return res.status(404).json({ message: 'Order status not updated' });
          }
        }
      }
      const address = await addressData.findOne({customerId:req.session.user});
  
      orderData.find().sort({ orderDate: -1 }).exec()
        .then((orders) => {
          res.render('order', { user: userId, orders: orders, countCart, countWishlist, address});
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
      const countCart = await cartData.find({ customerId: req.session.user }).countDocuments({});
      const countWishlist = await wishlistData.findOne({ customerId: req.session.user }).countDocuments({});
  
      const userId = req.session.user;
      const orderId = req.params.orderId;
      const order = await orderData.findOne({ _id: orderId });
  
      const products = await orderData.findById(orderId)
        .populate('products.productId').exec();
      const address = await addressData.findOne({customerId:req.session.user});
  
      if (!order) {
        return res.status(404).send('Order not found');
      }
  
      res.render('orderDetail', { user: userId, order, products, countCart, countWishlist, address });
    } catch (error) {
      res.render('orderDetail', { error: 'Error fetching product data.' });
    }
}; 

exports.loadAccount = async (req, res) => {
    try {
      const countCart = await cartData.find({ customerId: req.session.user }).countDocuments({});
      const countWishlist = await wishlistData.findOne({ customerId: req.session.user }).countDocuments({});
  
      const userId = req.session.user;
      const address = await addressData.findOne({ customerId: userId });
  
      const users = await UserLoginData.findById(userId);
      res.render('account', { user: userId, users, address, countCart, countWishlist });
    } catch (error) {
      res.render('account', { error: 'Error fetching product data.' });
    }
};  

exports.saveAddress = async (req, res) => {
    try {
      const customerId = req.session.user;
      const imageName = req.file.filename;
      const addressId = await addressData.findOne({customerId:customerId},{_id:1});
  
      const address = {
        userName: req.body.userName,
        userEmail: req.body.userEmail,
        userMobileNo: req.body.userMobileNo,
        alternateMobileNo:req.body.alternateMobileNo,
        userAddressLine1: req.body.userAddressLine1,
        userAddressLine2: req.body.userAddressLine2,
        userCountry: req.body.userCountry,
        userCity: req.body.userCity,
        userState: req.body.userState,
        userZIP: req.body.userZIP,
        userName2: req.body.userName2,
        userEmail2: req.body.userEmail2,
        alternateMobileNo2:req.body.alternateMobileNo2,
        userAddressLine12: req.body.userAddressLine12,
        userAddressLine22: req.body.userAddressLine22,
        userCountry2: req.body.userCountry2,
        userCity2: req.body.userCity2,
        userState2: req.body.userState2,
        userZIP2: req.body.userZIP2,
        profileImageName: imageName,
      } 
      const result = await addressData.findByIdAndUpdate(addressId,address);
      res.redirect('/user/account');
    } catch (error) {
      console.log(error);
      res.render('home', { error: 'Error fetching product data.' });
    }
};

exports.changePassword = async (req, res) => {
    try {
      const { currentPassword, newPassword, newPassword2 } = req.body;
      if (newPassword !== newPassword2) {
        console.log('Incorrect password');
        return res.redirect('/user/account');
      }
  
      const customerId = req.session.user;
      const user = await UserLoginData.findOne({ _id: customerId }, { password: 1 });
      const passwordMatch = await bcrypt.compare(currentPassword, user.password);
  
      if (passwordMatch) {
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        const updatePassword = await UserLoginData.findOneAndUpdate({ _id: customerId }, { password: hashedNewPassword });
  
        if (updatePassword.nModified !== 0) {
          return res.redirect('/user/account');
        } else {
          res.redirect('/user/logout');
        }
      }else{
        res.redirect('/user/logout');
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
};
  
exports.deleteAccount = async (req, res) => {
    try {
      const { userEmail , currentPassword } = req.body;
      const user = await UserLoginData.findOne({ email: userEmail }, { password: 1 });
      if(!user)
      {
        res.redirect('/user/logout');
      }
      const passwordMatch = await bcrypt.compare(currentPassword, user.password);
      if (passwordMatch) {
        const deleteAccount = await UserLoginData.deleteOne({ email: userEmail });
        res.redirect('/userSignup')
      }else{
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
        productId: productId
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
  
      if(parseFloat(productQuantity) < 1)
      {
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
        if(updatedQuantity >= 0)
        {
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
      console.log(wishlist);
  
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
      const address = await addressData.find({ customerId: customerId });
      const subTotal = parseFloat(req.params.subTotal);
      const total = parseFloat(req.params.total);
      const cartItems = await cartData.find({ customerId: customerId })
        .populate('productId')
        .exec();
      res.render('checkout', { user: customerId, address, cartItems, subTotal, total, countCart, countWishlist });
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
      const address = {
        userName: req.body.userName,
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
      const discount = 0.00;
      const total = subTotal + discount;
  
      const cartItems = await cartData.find({ customerId: req.session.user }).populate('productId').exec();
      const orderProducts = cartItems.map((cartItem) => ({
        productId: cartItem.productId._id,
        productQuantity: cartItem.productQuantity,
        productPrice: cartItem.productPrice
      }));
  
      const currentDate = moment(networkTime.date).format('YYYY-MM-DD HH:mm:ss');
  
      const order = new orderData({
        userId: req.session.user,
        products: orderProducts,
        total: total,
        orderDate: currentDate,
        paymentMethod: req.body.paymentMethod,
        address: address,
        paymentStatus: false,
      });
  
      const savedOrder = await order.save();
      req.session.orderId = savedOrder._id;
      if(req.body.paymentMethod === "Online")
      { 
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
      const address = await addressData.findOne({ customerId: customerId });
  
      const clearCartResult = await cartData.deleteMany({ customerId: customerId });
      console.log(`Successfully deleted ${clearCartResult.deletedCount} documents from the cart.`);
      const countWishlist = await wishlistData.countDocuments({ customerId: customerId });
  
      if(req.session.paymentMethod === "Online")
      {
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
        address,
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

exports.downloadInvoice = async(req, res) => {

    const orderId = req.params.orderId;
    const order = await orderData.findById(orderId).populate('products.productId').exec();
    const currentDate = moment(networkTime.date).format('YYYY-MM-DD HH:mm:ss');
  
    const invoiceData = {
      invoiceNumber: orderId,
      invoiceDate: currentDate,
      orderDate: order.orderDate,
      billingAddress: {
        name: order.address.userFirstName +" "+ order.address.userLastName,
        address: order.address.userAddressLine1 + order.address.userAddressLine1,
        city: order.address.userCity,
        state: order.address.userState,
        zip: order.address.userZIP,
        email: order.address.userEmail,
      },
      orderItems: order.products,
      subtotal: order.total,
      taxRate: 0.08,
      taxAmount: (order.total*0.08/100),
      totalAmount:(order.total + (order.total*0.08/100)),
    };
  
    // Create a new PDF document
    const doc = new PDFDocument();
  
    // Set response headers to indicate a PDF file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="smart-dept-invoice.pdf"');
  
    // Pipe the PDF document to the response stream
    doc.pipe(res);
  
    // Add content to the PDF (customize formatting and styling as needed)
    doc.fontSize(12);
  
    // Invoice header
    doc.text('SMART-DEPOT PURCHASE INVOICE', { align: 'center', fontSize: '20' });
    doc.moveDown();
    doc.text(`Invoice Number: ${invoiceData.invoiceNumber}`, { align: 'right' });
    doc.text(`Invoice Date: ${invoiceData.invoiceDate}`, { align: 'right' });
    doc.text(`Order Date: ${invoiceData.orderDate}`, { align: 'right' });
  
    // Billing address
    doc.moveDown();
    doc.text('Bill To:');
    doc.text(invoiceData.billingAddress.name);
    doc.text(invoiceData.billingAddress.address);
    doc.text(`${invoiceData.billingAddress.city}, ${invoiceData.billingAddress.state} ${invoiceData.billingAddress.zip}`);
    doc.text(`Email: ${invoiceData.billingAddress.email}`);
    
    // Order items table
    doc.moveDown(2);
    doc.text('Product', 100, doc.y);
    doc.text('Quantity', 300, doc.y, { width: 60, align: 'right' });
    doc.text('Unit Price', 400, doc.y, { width: 100, align: 'right' });
    doc.text('Item Total', 0, doc.y, { align: 'right' });
  
    doc.moveDown();
    let subTotal = 0;
    invoiceData.orderItems.forEach((product) => {
      doc.text(product.productId.productName, 100, doc.y);
      doc.text(product.productQuantity, 300, doc.y, { width: 60, align: 'right' });
      doc.text(`₹ ${product.productPrice}`, 400, doc.y, { width: 100, align: 'right' });
      doc.text(`₹ ${product.productQuantity * product.productPrice}`, 0, doc.y, { align: 'right' });
      doc.moveDown();
      subTotal = subTotal + (product.productQuantity * product.productPrice) ;
    });   
    doc.moveDown(2);
    doc.text('Subtotal:', 400, doc.y, { width: 100, align: 'right' });
    doc.text(`₹ ${subTotal.toFixed(2)}`, 0, doc.y, { align: 'right' }); 
    doc.moveDown();
    doc.text(`Tax (${(invoiceData.taxRate * 100).toFixed(2)}%):`, 400, doc.y, { width: 100, align: 'right' });
    doc.text(`₹ ${invoiceData.taxAmount.toFixed(2)}`, 0, doc.y, { align: 'right' });
  
    doc.moveDown();
    doc.text('Total:', 400, doc.y, { width: 100, align: 'right' });
    doc.text(`₹ ${invoiceData.totalAmount.toFixed(2)}`, 0, doc.y, { align: 'right' });
  
    // Finalize the PDF and send it to the client
    doc.end();
};
  
  