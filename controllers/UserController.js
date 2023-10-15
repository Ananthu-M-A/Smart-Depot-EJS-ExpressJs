const bcrypt = require('bcrypt');
const path = require('path');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const mongoose = require('mongoose');
const fs = require('fs');
const { ObjectId } = require('mongoose').Types;
const { error } = require('console');
const multer = require('multer');
const moment = require('moment');
const easyinvoice = require('easyinvoice');

const productData = require('../models/productModel');
const categoryData = require('../models/categoryModel');
const cartData = require('../models/cartModel');
const billingAddressData = require('../models/billingAddressModel');
const shippingAddressData = require('../models/shippingAddressModel');
const userLoginData = require('../models/userModel');
const wishlistData = require('../models/wishlistModel');
const walletData = require('../models/walletModel');
const couponOfferData = require('../models/couponOfferModel');
const orderData = require('../models/orderModel');

const networkTime = require('../middlewares/networkTime');

const transporter = require('../controllers/userOtpVerification');
const session = require('express-session');
const { log } = require('util');

async function getFilteredProducts(filter, page, itemsPerPage, req) {
  try {
    const options = {
      page: page,
      limit: itemsPerPage,
    };

    if (filter.productCategory) {
      options.populate = { path: 'productCategory' };
    }

    if (filter.productPrice) {
      options.where = { productPrice: filter.productPrice };
    }

    const result = await productData.paginate(filter, options);

    const populatedProducts = result.docs.map((product) => ({
      ...product.toJSON(),
      category: product.productCategory ? product.productCategory.productCategory : null,
    }));

    return {
      paginatedProducts: populatedProducts,
      categories: await categoryData.find(),
      users: await userLoginData.findById(req.session.user),
      countCart: await cartData.countDocuments({ customerId: req.session.user }),
      countWishlist: await wishlistData.countDocuments({ customerId: req.session.user }),
      totalPages: result.totalPages,
    };
  } catch (error) {
    throw error;
  }
}

function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

exports.loadSignupPage = (req, res) => {
  res.render('signup',{ errorMsg: undefined });
};

exports.signup = async (req, res) => {
  const { fullname, email, mobile, password } = req.body;
  const user = await userLoginData.findOne({ email });

  if (user) {
    const errorMsg = "Your Email already have an account...!";
    res.status(400).render('signup', { errorMsg });
  }  

  const otp = generateOTP()
  const currentTime = new Date();
  const otpTimeout = 120;
  const otpExpiry = new Date(currentTime.getTime() + otpTimeout * 1000);
  req.session.userData = {
    fullname,
    email,
    mobile,
    password,
    otp,
    otpExpiry,
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
  const otpExpiry = new Date(storedUserData.otpExpiry);
  const currentTime = new Date();

  if(!storedUserData) {
    res.status(400).send('User data not found in session');
    return;
  }

  if (currentTime > otpExpiry) {
    console.log("timeout");
    req.session.userData = null;
    return res.redirect("/userSignup");
  }

  if (enteredOTP === storedUserData.otp){
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
      res.render('login',{ errorMsg: undefined });
    } else {
      res.redirect('/');
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
  const currentTime = new Date();
  const otpTimeout = 120;
  const otpExpiry = new Date(currentTime.getTime() + otpTimeout * 1000);
  
  req.session.userData = { email, otp, otpExpiry };

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
    res.render('verifyOtpFP');
  } catch (error) {
    console.error('Error saving user:', error);
  }

};

exports.loadOtpPageFP = (req, res) => {
  res.render('verifyOtpFP');
};

exports.verifyOtpForgotPassword = async (req, res) => {
  const enteredOTP = req.body.otp;
  const storedUserData = req.session.userData;
  const otpExpiry = new Date(storedUserData.otpExpiry);
  const currentTime = new Date();

  if (!storedUserData) {
    res.status(400).send('User data not found in session');
    return;
  }

  if (currentTime > otpExpiry) {
    console.log("timeout");
    storedUserData.otp = null;
    return res.redirect('/userLogin/forgotPassword');
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
        res.redirect('/userLogin/forgotPassword');
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
      const errorMsg = 'User not found';
      res.status(400).render('login', { errorMsg });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (passwordMatch) {
      req.session.user = user._id;
      req.session.status = 'logged-in';
      return res.redirect('/');
    } else {
      const errorMsg = 'Enter correct password';
      res.status(401).render('login', { errorMsg });
    }
  } catch (error) {
    const errorMsg = 'Error during login';
    res.status(500).render('login', { errorMsg });
  }
};

exports.loadHomePage = async (req, res) => {
  try {
    const currentDate = new Date(moment(networkTime.date));
    const productOffer = await productData.find({},{offerStatus: 1, offerStart:1, offerEnd: 1});
    for (const offer of productOffer) {
      if (offer.offerStatus && offer.offerStatus === "Active") {
        const lastDate = new Date(offer.offerEnd);
        if ((currentDate - lastDate) / (1000 * 60 * 60 * 24) > 0) {
          const result = await productData.findOneAndUpdate(
            { _id: offer._id },
            { offerStatus: "Expired" }
          );
        }
      }
    }

    const categoryOffer = await categoryData.find({},{offerStatus: 1, offerStart: 1, offerEnd: 1});
    for (const offer of categoryOffer) {
      if (offer.offerStatus && offer.offerStatus === "Active") {
        const lastDate = new Date(offer.offerEnd);
        if ((currentDate - lastDate) / (1000 * 60 * 60 * 24) > 0) {
          const result = await categoryData.findOneAndUpdate(
            { _id: offer._id },
            { offerStatus: "Expired" }
          );
        }
      }
    }

    const couponOffer = await couponOfferData.find({});
    for (const offer of couponOffer) {
      if (offer.offerStatus && offer.offerStatus === "Active") {
        const lastDate = new Date(offer.offerEnd);
        if ((currentDate - lastDate) / (1000 * 60 * 60 * 24) > 0) {
          const result = await couponOfferData.findOneAndUpdate(
            { _id: offer._id },
            { offerStatus: "Expired" }
          );
        }
      }
    }

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    const itemsPerPage = 4;
    const page = parseInt(req.query.page) || 1;
    const filter = {};


    const { paginatedProducts, categories, users, countCart, countWishlist, totalPages } =
      await getFilteredProducts(filter, page, itemsPerPage, req);

      if(users.offerApplied){
        const date = new Date(users.offerAppliedDate);
        const daysDiff = (currentDate - date) / (1000 * 60 * 60 * 24);
        if (daysDiff > 30) {
          const result = await userLoginData.findOneAndUpdate({_id: req.session.user}, { offerApplied: false, offerAppliedDate: "" }, { new: true });
          if (!result) {
            return res.status(404).json({ message: 'Offer applied status not updated' });
          }
        }
      }
    let pageRoute = req.path;

    res.render('home', {
      user: req.session.user,
      products: paginatedProducts,
      categories,
      users,
      countCart,
      countWishlist,
      totalPages,
      currentPage: page,
      selectedCategories: [],
      selectedMinPriceRange: 0,
      selectedMaxPriceRange: 10000,
      pageRoute,
      couponOffer
    });

  } catch (error) {
    res.status(500).render('home', { error: 'Error fetching product data.' });
  }
};



exports.searchProducts = async (req, res) => {
  const query = req.query.searchInput;
  const page = parseInt(req.query.page) || 1;

  if (!query) {
    res.redirect('/');
  }

  try {
    let filter = {
      $or: [
        { productName: { $regex: query, $options: 'i' } },
        { productBrand: { $regex: query, $options: 'i' } },
        { productQuality: { $regex: query, $options: 'i' } },
        { productDescription: { $regex: query, $options: 'i' } },
        {
          productCategory: {
            $in: await categoryData.distinct('_id', {
              productCategory: { $regex: query, $options: 'i' },
            }),
          },
        },
      ],
    };

    if (parseFloat(query)) {
      filter = {
        $or: [
          filter,
          { productPrice: { $lte: parseFloat(query) } },
        ],
      };
    }

    const categories = await categoryData.find();
    const users = await userLoginData.findById(req.session.user);
    const countCart = await cartData.countDocuments({ customerId: req.session.user });
    const countWishlist = await wishlistData.countDocuments({ customerId: req.session.user });

    const options = { page: page, limit: 4 };

    const result = await productData.paginate(filter, options, { populate: 'productCategory' });

    if (result.docs.length === 0) {
      // No products found, you can handle this case as needed
    }
    let pageRoute = req.path;

    res.render('home', {
      user: req.session.user,
      products: result.docs,
      categories,
      users,
      countCart,
      countWishlist,
      totalPages: result.totalPages,
      currentPage: result.page,
      selectedCategories: [],
      selectedMinPriceRange: 0,
      selectedMaxPriceRange: 10000,
      pageRoute,
    });

  } catch (error) {
    console.log(error);
    res.render('home', { error: 'Error searching products.' });
  }
};

exports.filterProducts = async (req, res) => {
  try {
    const categoryNames = req.query.category || req.query.categoryNames || [];

    const minPriceRange = parseInt(req.query.minPriceRange);
    const maxPriceRange = parseInt(req.query.maxPriceRange);

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
    console.log(page);

    const {
      paginatedProducts,
      categories,
      users,
      countCart,
      countWishlist,
      totalPages,
    } = await getFilteredProducts(filter, page, itemsPerPage, req);

    // console.log(paginatedProducts);

    let pageRoute = req.path;

    res.render('home', {
      user: req.session.user,
      products: paginatedProducts,
      categories,
      users,
      countCart,
      countWishlist,
      totalPages,
      currentPage: page,
      selectedCategories: categoryNames,
      selectedMinPriceRange: minPriceRange,
      selectedMaxPriceRange: maxPriceRange,
      pageRoute,
    });

  } catch (error) {
    console.log(error);
    res.status(500).render('home', { error: 'Error fetching product data.' });
  }
};

exports.clearFilter = async (req, res) => {
  try {
    const categoryNames = [];
    const minPriceRange = 0;
    const maxPriceRange = 10000;

    req.session.filter = {
      categories: categoryNames,
      minPrice: minPriceRange,
      maxPrice: maxPriceRange,
    };
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
    } = await getFilteredProducts({}, page, itemsPerPage, req);

    let pageRoute = "/";

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
      selectedCategories: categoryNames,
      selectedMinPriceRange: minPriceRange,
      selectedMaxPriceRange: maxPriceRange,
      pageRoute
    });

  } catch (error) {
    res.render('home', { error: 'Error fetching product data.' });
  }
};


exports.loadProductDetail = async (req, res) => {
  try {
    const countCart = await cartData.find({ customerId: req.session.user }).countDocuments({});
    const countWishlist = await wishlistData.findOne({ customerId: req.session.user }).countDocuments({});
    const users = await userLoginData.findById(req.session.user);
    let offer;
    const productId = req.query.productId;
    const categoryId = req.query.categoryId;
    const fetchedProduct = await productData.findById(productId).populate('productCategory');
    if(users.offerApplied){
      const currentDate = new Date(moment(networkTime.date));
      const date = new Date(users.offerAppliedDate);
      const daysDiff = (currentDate - date) / (1000 * 60 * 60 * 24);
      if (daysDiff > 30) {
        const result = await userLoginData.findOneAndUpdate({_id: req.session.user}, { offerApplied: false, offerAppliedDate: "" }, { new: true });
        if (!result) {
          return res.status(404).json({ message: 'Offer applied status not updated' });
        }
      }
    }

    if(users.offerApplied){
      offer = 0;
    } else if(fetchedProduct.offerStatus === "Active"){
      offer = fetchedProduct.offerValue;
    } else if(fetchedProduct.productCategory.offerStatus === "Active") {
      offer = fetchedProduct.productCategory.offerValue;
    } else {
      offer = 0;
    }

    res.render('productDetail', { user: req.session.user, product: fetchedProduct, countCart, countWishlist, users , offer });
  } catch (error) {
    res.render('home', { error: 'Error fetching product data.' });
  }
};

exports.loadCart = async (req, res) => {
  try {
    const couponOffer = req.query.offer;
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
    const offers = await couponOfferData.find({offerStatus: "Active"});
    const totalOffers = offers.length;
    res.render('cart', { user: req.session.user, productQuantity, cartItems, countCart, countWishlist, users, categories, couponOffer, offers, totalOffers});
  } catch (error) {
    res.render('cart', { error: 'Error fetching product data.' });
  }
};

exports.removeCartItem = async (req, res) => {
  try {
    const productId = req.params.productId;
    const customerId = req.session.user;
    const result = await cartData.findOneAndRemove({ productId, customerId: customerId });
    res.redirect('/cart')
  } catch (error) {
    res.render('cart', { error: 'Error fetching product data.' });
  }
};

exports.applyOffer = async(req, res) => {
  try {
    const { couponCode } = req.body;
    const code = couponCode.substring(5);
    const offer = await couponOfferData.findOne({couponCode: couponCode});
    const couponMatched = await bcrypt.compare(code, offer.hashedCouponCode);
    if(couponMatched)
    {
      return res.redirect(`/cart?offer=${offer.offerValue}`);
    }
    res.redirect('/cart');

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error applying offer', error: error.message });
  }
}


exports.loadWishlist = async (req, res) => {
  try {
    const customerId = req.session.user;
    const wishlist = await wishlistData.find({ customerId: customerId }).populate('product');
    const countCart = await cartData.find({ customerId }).countDocuments({});
    const countWishlist = await wishlistData.findOne({ customerId: req.session.user }).countDocuments({});
    const users = await userLoginData.findById(customerId);
    
    res.render('wishList', { user: customerId, wishlist, countCart, countWishlist, users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.loadWallet = async (req,res) => {
  try {
    const customerId = req.session.user;
    const wallet = await walletData.findOne({customerId: customerId});
    const countCart = await cartData.find({ customerId }).countDocuments({});
    const countWishlist = await wishlistData.findOne({ customerId: req.session.user }).countDocuments({});
    const users = await userLoginData.findById(customerId);
    const orders = await orderData.find({userId: customerId});
    
    res.render('wallet', { user: customerId, wallet, countCart, countWishlist, users, orders });
    
  } catch (error) {
    console.log(error);
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

    res.redirect('/wishList');
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
    
    orderData.find({ userId: userId }).sort({ orderDate: -1 }).exec()
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

    if(result)
    {
      const orderedProducts = await orderData.findOne({ _id: orderId }, 'products.productId products.productQuantity');
      const order = await orderData.findOne({ _id: orderId});
  
      for (const orderedProducts of order.products) {
        const productId = orderedProducts.productId;
        const productQuantity = orderedProducts.productQuantity;
        const product = await productData.findOne({ _id: productId });
          product.productStock += productQuantity;
          await product.save();
          console.log(`Product ${product.productName} stock increased by ${productQuantity}.`);
      }
      console.log('Product stock updated successfully for all ordered products.');
    }

    if (result.nModified === 0) {
      return res.status(404).json({ message: 'Order status not updated' });
    }

    const orders = await orderData.find({ userId: userId });
    res.redirect('/orders');
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
    let imageName = req.file;
    if(imageName)
    {
      imageName =  req.file.filename;
    }
    const userData = {
      fullname: req.body.userName,
      mobile: req.body.userMobileNo,
      profileImageName: imageName,
    }
    if(userData){
      await userLoginData.findByIdAndUpdate(customerId, userData, {upsert: true} );
    }

    res.redirect('/account');
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
    res.redirect('/account');
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
    res.redirect('/account');
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
    res.redirect('/account');
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
    res.redirect('/account');
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
      return res.redirect('/account');
    }

    const customerId = req.session.user;
    const user = await userLoginData.findOne({ _id: customerId }, { password: 1 });
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);

    if (passwordMatch) {
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      const updatePassword = await userLoginData.findOneAndUpdate({ _id: customerId }, { password: hashedNewPassword });

      if (updatePassword.nModified !== 0) {
        return res.redirect('/account');
      } else {
        res.redirect('/logout');
      }
    } else {
      res.redirect('/logout');
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
      res.redirect('/logout');
    }
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (passwordMatch) {
      const deleteAccount = await userLoginData.deleteOne({ email: userEmail });
      res.redirect('/userSignup')
    } else {
      res.redirect('/logout');
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
      if(products.productStock < updatedQuantity)
      {
        return res.redirect("/cart");
      }
      const updatedProduct = { productQuantity: updatedQuantity };
      const result = await cartData.findByIdAndUpdate(cartProduct._id, updatedProduct, { new: true });
      if (!result) {
        return res.render('home', { error: 'Product not found.' });
      }
      return res.redirect('/cart');
    } else {
      if(products.productStock < productQuantity)
      {
        return res.redirect("/cart");
      }
      const cartItems = new cartData({
        customerId: customerId,
        productId: productId,
        categoryId: products.productCategory,
        productQuantity: productQuantity,
        productPrice: products.productPrice,
        createdTime: currentDate,
      });
      const result = await cartItems.save();
      return res.redirect('/cart');
    }
  } catch (error) {
    console.error('Error adding product to cart: ', error);
    return res.render('cart', { error: 'Error adding product to cart.' });
  }
};

exports.changeQuantity = async (req, res) => {
  try {
    const customerId = req.session.user;
    const { productId, productQuantity } = req.params;
    const product = await productData.findOne({_id: productId},{productStock:1,_id:0});
    console.log(product.productStock);

    if (parseFloat(productQuantity) < 1 || product.productStock < parseFloat(productQuantity)) {
      res.redirect('/cart');
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
        res.redirect('/cart');
      }

      const updatedProduct = { productQuantity: updatedQuantity };
      const result = await cartData.findByIdAndUpdate(cartProduct._id, updatedProduct, { new: true });
      if (!result) {
        return res.render('home', { error: 'Product not found.' });
      }
      res.redirect('/cart');
    } else {
      const cartItems = new cartData({
        customerId: customerId,
        productId: productId,
        productQuantity: productQuantity,
        productPrice: products.productPrice,
        createdTime: currentDate,
      });
      const result = await cartItems.save();
      res.redirect('/cart');
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
      res.redirect('/wishList');
    } else {
      if (wishlist.product.equals(productId)) {
        console.log('product already exists in wishlist');
        res.redirect('/wishList');
      } else {
        console.log('user exists, but product does not');
        wishlist.product = productId;
        await wishlist.save();
        res.redirect('/wishList');
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
    const discount = parseFloat(req.params.discount)
    const users = await userLoginData.findById(customerId);
    const cartItems = await cartData.find({ customerId: customerId })
      .populate('productId')
      .populate('categoryId')
      .populate('customerId')
      .exec();
    res.render('checkout', { user: customerId, users, billingAddress, shippingAddress, cartItems, subTotal, total, countCart, countWishlist, discount });
  } catch (error) {
    res.render('checkout', { error: 'Error fetching product data.' });
  }
};

 
exports.addAddressCheckout = async (req, res) => {
  try {
    const customerId = req.session.user;

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

    if(shippingAddress && billingAddress)
    {
      const result1 = await billingAddress.save();
      const result2 = await shippingAddress.save();
    }
  } catch (error) {
    console.log(error);
    res.render('home', { error: 'Error fetching product data.' });
  }
}

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
    res.redirect('/orders');
  } catch (error) {
    res.status(500).json({ message: 'Error updating order status', error: error.message });
  }
};

exports.placeOrder = async (req, res) => {
  try {
    const currentDate = moment(networkTime.date).format('YYYY-MM-DD HH:mm:ss');
    const subTotal = parseFloat(req.params.subTotal);
    const discount = parseFloat(req.params.discount);
    const total = subTotal - discount;

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
    });

    const savedOrder = await order.save();
    req.session.orderId = savedOrder._id;
    if (req.body.paymentMethod === "Online") {
      req.session.paymentMethod = "Online";
      res.redirect(`/payment/createOrder?id=${savedOrder._id}`);
    }
    else {
      req.session.paymentMethod = "COD";
      res.redirect(`/orderConfirmation?id=${savedOrder._id}`);
    }

  } catch (error) {
    console.log(error);
    res.redirect('/');
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
    
    const orderedProducts = await orderData.findOne({ _id: orderId }, 'products.productId products.productQuantity');
    const order = await orderData.findOne({ _id: orderId });

    for (const orderedProducts of order.products) {
      const productId = orderedProducts.productId;
      const productQuantity = orderedProducts.productQuantity;
      const product = await productData.findOne({ _id: productId });
      if (product.productStock >= productQuantity) {
        product.productStock -= productQuantity;
        await product.save();
        console.log(`Product ${product.productName} stock decreased by ${productQuantity}.`);
      } else {
        console.log(`Not enough stock available for product ${product.productName}.`);
      }
    }
    console.log('Product stock updated successfully for all ordered products.');

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
        orderStatus: "Order Confirmed",
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
    const orderTotal = req.params.total;
    const order = await orderData.findById(orderId)
    .populate('userId')
    .populate('products.productId')
    .populate('billingAddress')
    .populate('shippingAddress')
    .exec();

    let tax;
    let totalPrice = 0;
    order.products.forEach((product) => {
      totalPrice += (product.offerPrice || product.productPrice) * product.productQuantity;
    });
    tax = ((totalPrice - orderTotal)*100)/totalPrice;
    
    const currentDate = moment(networkTime.date).format('YYYY-MM-DD HH:mm:ss');
    const products = order.products.map((product) => ({
      "quantity": product.productQuantity,
      "description": product.productId.productName,
      "tax-rate": -tax,
      "price": product.offerPrice || product.productPrice,
    }));


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
      "bottomNotice": "Coupon offer applied (vat)",
      "vat": 0,
      "vatPercentage": 0,
    };

    
    let filePath = path.join(__dirname,'/invoice.pdf');

    easyinvoice.createInvoice(data, function (result) {
      const pdf = result.pdf;
    
      if (!pdf) {
        console.error('PDF data is empty');
        res.status(500).send('Error: Empty PDF data');
        return;
      }
  
      fs.writeFile(filePath, Buffer.from(pdf, 'base64'), function (err) {
        if (err) {
          console.error('Error while saving the PDF:', err);
          res.status(500).send('Error while generating the invoice');
        } else {
          console.log('PDF saved as', filePath);
    
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
  } catch (err) {
    console.error('Error:', err);
    res.status(500).send('An error occurred');
  }  
}
