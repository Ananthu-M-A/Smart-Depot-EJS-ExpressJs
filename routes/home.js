const express = require('express');
const path = require('path');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const router = express.Router();
const productData = require('../models/productModel');
const categoryData = require('../models/categoryModel');
const cartData = require('../models/cartModel');
const addressData = require('../models/addressModel');
const UserLoginData = require('../models/userModel');
const orderData = require('../models/orderModel');
const wishlistData = require('../models/wishlistModel');
const requireAuth = require('../middlewares/isAuthenticatedUser');
const isUserBlocked = require('../middlewares/isUserBlocked');
const moment = require('moment');

router.get('/', requireAuth, isUserBlocked, async (req, res) => {
  try {
    const itemsPerPage = 4;
    const page = parseInt(req.query.page) || 1;
    const startIndex = (page - 1) * itemsPerPage;
    const countCart = await cartData.find({ customerId: req.session.user }).countDocuments({});
    const countWishlist = await wishlistData.find({ customerId: req.session.user }).countDocuments({});
    const totalProducts = await productData.countDocuments();
    const paginatedProducts = await productData.find()
      .skip(startIndex)
      .limit(itemsPerPage);
    const totalPages = Math.ceil(totalProducts / itemsPerPage);
    const categories = await categoryData.find();
    const users = await UserLoginData.findById(req.session.user);

    res.render('home', { user: req.session.user, products: paginatedProducts,
      categories, users, countCart, countWishlist, totalPages, currentPage: page });
  
  } catch (error) {
    res.render('home', { error: 'Error fetching product data.' });
  }
});



router.get('/search', requireAuth, isUserBlocked, async (req, res) => {
  const query = req.query.searchInput;
  if (!query) {
    res.redirect('/home');
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
    const categories = await categoryData.find();
    const countCart = await cartData.find({ customerId: req.session.user }).countDocuments({});
    const countWishlist = await wishlistData.find({ customerId: req.session.user }).countDocuments({});
    const users = await UserLoginData.findById(req.session.user);
    res.render('home', { user: req.session.user, products, categories, users, countCart, countWishlist });
  } catch (error) {
    res.render('home', { error: 'Error searching products.' });
  }
});

router.get('/filterProducts', requireAuth, isUserBlocked, async (req, res) => {
  try {
    const productCategory = req.query.category;
    const productPriceRange = req.query.priceRange
    const filter = {};

    if (productCategory) {
      filter.productCategory = productCategory;
    }

    if (productPriceRange) {
      const [minPrice, maxPrice] = productPriceRange.split('-');
      if ((maxPrice === undefined) && (minPrice == 500)) {
        filter.productPrice = { $lte: parseInt(minPrice) };
      }
      else if ((maxPrice === undefined) && (minPrice == 5000)) {
        filter.productPrice = { $gte: parseInt(minPrice) };
      }
      else {
        filter.productPrice = { $gte: parseInt(minPrice), $lte: parseInt(maxPrice) };
      }
    }

    const filteredProducts = await productData.find(filter);
    const categories = await categoryData.find();
    const countCart = await cartData.find({ customerId: req.session.user }).countDocuments({});
    const countWishlist = await wishlistData.find({ customerId: req.session.user }).countDocuments({});
    const users = await UserLoginData.findById(req.session.user);
    res.render('home', { user: req.session.user, products: filteredProducts, categories, users, countCart, countWishlist });

  } catch (error) {
    res.render('home', { error: 'Error fetching product data.' });
  }
});


router.get('/productDetails/:productId', requireAuth, isUserBlocked, async (req, res) => {
  try {
    const countCart = await cartData.find({ customerId: req.session.user }).countDocuments({});
    const countWishlist = await wishlistData.find({ customerId: req.session.user }).countDocuments({});
    const productId = req.params.productId;
    const fetchedProduct = await productData.findById(productId);
    res.render('productDetail', { user: req.session.user, product: fetchedProduct, countCart, countWishlist });
  } catch (error) {
    res.render('home', { error: 'Error fetching product data.' });
  }
});

router.get('/cart', requireAuth, isUserBlocked, async (req, res) => {
  try {
    const countCart = await cartData.find({ customerId: req.session.user }).countDocuments({});
    const countWishlist = await wishlistData.find({ customerId: req.session.user }).countDocuments({});
    const cartItems = await cartData.find({ customerId: req.session.user })
      .populate('productId')
      .exec();
    const productQuantity = req.body.quantity;
    res.render('cart', { user: req.session.user, productQuantity, cartItems, countCart, countWishlist });
  } catch (error) {
    res.render('cart', { error: 'Error fetching product data.' });
  }
});

router.get('/removeCartItem/:productId', requireAuth, isUserBlocked, async (req, res) => {
  try {
    const productId = req.params.productId;
    const customerId = req.session.user;
    const result = await cartData.findOneAndRemove({ productId, customerId: customerId });
    res.redirect('/home/cart')
  } catch (error) {
    res.render('cart', { error: 'Error fetching product data.' });
  }
});


router.get('/wishlist', requireAuth, isUserBlocked, async (req, res) => {
  try {
    const customerId = req.session.user;
    const wishlist = await wishlistData.findOne({ customerId: customerId }).populate('products');

    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }
    const countCart = await cartData.find({ customerId }).countDocuments({});
    const userWishlist = await wishlistData.findOne({ customerId: customerId })
    .populate('products.productId')
    .exec();
    const countWishlist = userWishlist.products.length;

    res.render('wishlist', { user: customerId, wishlist, countCart, countWishlist });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});


router.get('/removeWishlistItem/:productId', requireAuth, isUserBlocked, async (req, res) => {
  try {
    const productId = req.params.productId;
    const customerId = req.session.user;

    const result = await wishlistData.findOneAndUpdate(
      { customerId },
      { $pull: { products: productId } },
      { new: true }
    );

    res.redirect('/home/wishlist');
  } catch (error) {
    res.render('cart', { error: 'Error removing product from the wishlist.' });
  }
});


router.get('/orders', requireAuth, isUserBlocked, async (req, res) => {
  try {
    const countCart = await cartData.find({ customerId: req.session.user }).countDocuments({});
    const countWishlist = await wishlistData.find({ customerId: req.session.user }).countDocuments({});
    const userId = req.session.user;
    const orders = await orderData.find({ userId: userId });

    for (const order of orders) {
      const currentDate = new Date();
      const date = moment(order.deliveredDate, 'YYYY-MM-DD HH:mm:ss').toDate();
      const daysDiff = (currentDate - date) / (1000 * 60 * 60 * 24);
      if (daysDiff > 14) {
        const result = await orderData.findOneAndUpdate({ _id: order._id }, { orderStatus: "Order Closed" }, { new: true });
        if (!result) {
          return res.status(404).json({ message: 'Order status not updated' });
        }
      }
    }

    orderData.find().sort({ orderDate: -1 }).exec()
      .then((orders) => {
        res.render('order', { user: userId, orders: orders, countCart, countWishlist });
      })
      .catch((err) => {
        console.error('Error loading orders:', err);
      });
    
  } catch (error) {
    res.render('order', { error: 'Error loading product data.' });
  }
});

router.get('/cancelOrder/:orderId', requireAuth, isUserBlocked, async (req, res) => {
  try {
    const countCart = await cartData.find({ customerId: req.session.user }).countDocuments({});
    const countWishlist = await wishlistData.find({ customerId: req.session.user }).countDocuments({});
    const userId = req.session.user;
    const orderId = req.params.orderId;
    const updatedOrder = { orderStatus: "Order Cancelled" };
    const result = await orderData.findByIdAndUpdate(orderId, updatedOrder, { new: true });
    const orders = await orderData.find({ userId: userId });
    res.render('order', { user: userId, orders: orders, countCart, countWishlist });
  } catch (error) {
    res.render('order', { error: 'Error fetching product data.' });
  }
});

router.get('/returnOrder/:orderId', requireAuth, isUserBlocked, async (req, res) => {
  try {
    const countCart = await cartData.find({ customerId: req.session.user }).countDocuments({});
    const countWishlist = await wishlistData.find({ customerId: req.session.user }).countDocuments({});
    const userId = req.session.user;
    const orderId = req.params.orderId;
    const updatedOrder = { orderStatus: "Return Initiated" };
    const result = await orderData.findByIdAndUpdate(orderId, updatedOrder, { new: true });
    const orders = await orderData.find({ userId: userId });
    res.render('order', { user: userId, orders: orders, countCart, countWishlist });
  } catch (error) {
    res.render('order', { error: 'Error fetching product data.' });
  }
});

router.get('/orderDetail/:orderId', requireAuth, isUserBlocked, async (req, res) => {
  try {
    const countCart = await cartData.find({ customerId: req.session.user }).countDocuments({});
    const countWishlist = await wishlistData.find({ customerId: req.session.user }).countDocuments({});
    const userId = req.session.user;
    const orderId = req.params.orderId;
    const order = await orderData.findOne({ _id: orderId });

    const products = await orderData.findById(orderId)
      .populate('products.productId').exec();

    if (!order) {
      return res.status(404).send('Order not found');
    }

    res.render('orderDetail', { user: userId, order, products, countCart, countWishlist });
  } catch (error) {
    res.render('orderDetail', { error: 'Error fetching product data.' });
  }
});

router.get('/account', requireAuth, isUserBlocked, async (req, res) => {
  try {
    const countCart = await cartData.find({ customerId: req.session.user }).countDocuments({});
    const countWishlist = await wishlistData.find({ customerId: req.session.user }).countDocuments({});
    const userId = req.session.user;
    const billAddress = await addressData.find({ customerId: userId })
    const users = await UserLoginData.findById(userId);
    res.render('account', { user: userId, users, billAddress, countCart, countWishlist });
  } catch (error) {
    res.render('account', { error: 'Error fetching product data.' });
  }
});


router.post('/saveAddress', requireAuth, async (req, res) => {
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

router.post('/cart/:productId', requireAuth, async (req, res) => {
  try {
    const customerId = req.session.user;
    const productId = req.params.productId;
    const productQuantity = req.body.quantity;
    const products = await productData.findById(productId);    
    const dateString = new Date();
    const currentDate = moment(dateString).format('YYYY-MM-DD HH:mm:ss');

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
      res.redirect('/home/cart');
    } else {
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
    console.error('Error adding product to cart: ', error);
    res.render('cart', { error: 'Error adding product to cart.' });
  }
});

// router.post('/home/addQuantity/:productId/:productQuantity', requireAuth, async (req, res) => {
//   try {
//     console.log('1234');
//     const customerId = req.session.user;
//     const { productId, quantity } = req.params;
//     console.log(productId,productQuantity);
//     const products = await productData.findById(productId);
//     const currentDate = new Date();

    // const cartProduct = await cartData.findOne({
    //   customerId: customerId,
    //   productId: productId
    // });

    // if (cartProduct) {
    //   const updatedQuantity = parseFloat(productQuantity) + parseFloat(cartProduct.productQuantity);
    //   const updatedProduct = { productQuantity: updatedQuantity };
    //   const result = await cartData.findByIdAndUpdate(cartProduct._id, updatedProduct, { new: true });
    //   if (!result) {
    //     return res.render('home', { error: 'Product not found.' });
    //   }
    //   res.redirect('/home/cart');
    // } else {
    //   const cartItems = new cartData({
    //     customerId: customerId,
    //     productId: productId,
    //     productQuantity: productQuantity,
    //     productPrice: products.productPrice,
    //     createdTime: currentDate,
    //   });
    //   const result = await cartItems.save();
    //   res.redirect('/home/cart');
    // }
//   } catch (error) {
//     console.error('Error adding product to cart: ', error);
//     res.render('cart', { error: 'Error adding product to cart.' });
//   }
// });


router.post('/wishlist/:productId', async (req, res) => {
  try {
    const customerId = req.session.user;
    const productId = req.params.productId;

    const customerExists = await UserLoginData.findById(customerId).exec();
    const productExists = await productData.findById(productId).exec();

    if (!customerExists || !productExists) {
      console.error('Customer or product not found');
      return res.status(404).json({ message: 'Customer or product not found' });
    }

    const wishlist = await wishlistData.findOne({ customerId: customerId });

    if (!wishlist) {
      const newWishlist = new wishlistData({
        customerId: customerId,
        products: [productId],
      });

      await newWishlist.save();
    } else {
      if (wishlist.products.includes(productId)) {
        return res.redirect('/home/wishlist');
      } else {
        wishlist.products.push(productId);
        await wishlist.save();
      }
    }

    res.redirect('/home/wishlist');
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


router.post('/checkout/:subTotal/:total', requireAuth, async (req, res) => {
  try {
    const countCart = await cartData.find({ customerId: req.session.user }).countDocuments({});
    const countWishlist = await wishlistData.find({ customerId: req.session.user }).countDocuments({});
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
});

router.post('/updateOrderStatus/:orderId', requireAuth, async (req, res) => {
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
    res.redirect('/home/orders');
  } catch (error) {
    res.status(500).json({ message: 'Error updating order status', error: error.message });
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
    const discount = 0.00;
    const total = subTotal + discount;

    const cartItems = await cartData.find({ customerId: req.session.user }).populate('productId').exec();
    const orderProducts = cartItems.map((cartItem) => ({
      productId: cartItem.productId._id,
      productQuantity: cartItem.productQuantity,
      productPrice: cartItem.productPrice
    }));

    const dateString = new Date();
    const currentDate = moment(dateString).format('YYYY-MM-DD HH:mm:ss');

    const order = new orderData({
      userId: req.session.user,
      products: orderProducts,
      total: total,
      orderDate: currentDate,
      paymentMethod: req.body.payment,
      address: address,
    });

    const savedOrder = await order.save();
    const customerId = req.session.user;

    const clearCart = cartData.deleteMany({ customerId: customerId });
    clearCart.then(result => {
      console.log(`Successfully deleted ${result.deletedCount} documents from the cart.`);
    });
    const countCart = await cartData.find({ customerId: req.session.user }).countDocuments({});

    const countWishlist = await wishlistData.find({ customerId: req.session.user }).countDocuments({});
    res.render('orderConfirmation', { user: customerId, savedOrder: savedOrder, countCart, countWishlist });
  } catch (error) {
    console.log(error);
    res.redirect('/home');
  }
});

router.get('/logout', async (req, res) => {
  try {
    req.session.status = 'logged-out';
    req.session.destroy();
    res.redirect('/login');
  } catch (error) {
    res.render('login', { error: 'Error logging in' });
  }
});

router.get('/downloadInvoice/:orderId', async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await orderData.findById(orderId);

    if (!order) {
      return res.status(404).send('Order not found');
    }

    const doc = new PDFDocument();
    const filename = `order-smartdepot-${orderId}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    doc.fontSize(14).text('Smart Depot Invoice', { align: 'center' }).moveDown(1);

    doc.fontSize(10).text(`Order ID: ${order._id}`);
    doc.fontSize(10).text(`Order Date: ${order.orderDate}`);
    doc.fontSize(10).text(`Order Status: ${order.orderStatus}`);
    doc.fontSize(10).text(`Shipping Address: ${order.address}`);
    doc.moveDown(1);
    doc.fontSize(10).text(`Payment Method: ${order.paymentMethod}`);
    doc.moveDown(1);

    doc.fontSize(12).text('Purchased Items:', { underline: true }).moveDown(1);

    let i = 1;
    order.products.forEach((product) => {
      doc.fontSize(10).text(`${i} :   ${product._id}    ${product.productPrice}    ${product.productQuantity}   ${product.productPrice * product.productQuantity}`);
      i++;
    });

    doc.fontSize(10).text(`                                                    Order Total : ${order.total}`);

    doc.end();

  } catch (error) {
    console.error(error);
    res.redirect('/home/orders');
  }
});


module.exports = router;
