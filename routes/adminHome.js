const express = require('express');
const multer = require('multer');
const path = require('path');
let mongoose = require('mongoose');
const productData = require('../models/productModel');
const UserLoginData = require('../models/userModel');
const categoryData = require('../models/categoryModel');
const orderData = require('../models/orderModel');
const requireAuth = require('../middlewares/isAuthenticatedAdmin');
const router = express.Router();

const storage = multer.diskStorage({
  destination: 'uploads/productImage/',
  filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + '.jpg');
  }
});

const upload = multer({ storage : storage });

router.get('/', requireAuth, async (req, res) => {
  try {
    const products = await productData.find();
    const users = await UserLoginData.find();
    const categories = await categoryData.find();
    const orders = await orderData.find();
    res.render('adminHome', { admin : req.session.admin , products, users, categories, orders });
    }
  catch (error) {
    res.render('adminHome', { error: 'Error fetching user data.' });
  }
});

router.get('/products', requireAuth, async (req, res) => {
  try {
    res.render('adminHome' , { admin : req.session.admin });
  }
  catch (error) {
    res.render('adminHome', { error: 'Error fetching user data.' });
  }
});


router.post('/addProduct', requireAuth, upload.array('images', 4), async (req, res) => {
  try {
    const {
      productName,
      productCategory,
      productBrand,
      productQuality,
      productPrice,
      productStock,
      productDescription,
    } = req.body;

    const imageNames = req.files.map(file => file.filename);

    const product = new productData({
      productName: productName,
      productCategory: productCategory,
      productBrand: productBrand,
      productQuality: productQuality,
      productPrice: productPrice,
      productStock: productStock,
      productDescription: productDescription,
      productImageNames: imageNames,
      blocked: false,

    });


    const result = await product.save();
    res.redirect('/adminHome');
  } catch (error) {
    res.render('adminHome', { error: 'Error fetching user data.' });
  }
});

router.post('/updateProduct/:productId', requireAuth, upload.array('images', 4), async (req, res) => {
  try {
    const {
      productName,
      productCategory,
      productBrand,
      productQuality,
      productPrice,
      productStock,
      productDescription,
    } = req.body;

    const imageNames = req.files.map(file => file.filename);

    const productId = req.params.productId;
    const updatedProduct = {
      productName: productName,
      productCategory: productCategory,
      productBrand: productBrand,
      productQuality: productQuality,
      productPrice: productPrice,
      productStock: productStock,
      productDescription: productDescription,
      productImageNames: imageNames,
    };

    const result = await productData.findByIdAndUpdate(productId, updatedProduct, { new: true });

    if (!result) {
      return res.render('adminHome', { error: 'Product not found.' });
    }

    res.redirect('/adminHome');
  } catch (error) {
    res.render('adminHome', { error: 'Error updating the product.' });
  }
});



router.patch('/userBlockStatus', requireAuth, async (req, res) => {
  try {
    let result;
    const blockStatus = await UserLoginData.findOne({ _id: req.body.id }, { blocked: 1, _id: 0 });
    if (blockStatus.blocked === true) {
      
      result = await UserLoginData.findByIdAndUpdate(req.body.id, { blocked: false });
    }
    else {
      result = await UserLoginData.findByIdAndUpdate(req.body.id, { blocked: true });
    }

    if (result.nModified === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User block status changed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error toggling user admin status', error: error.message });
  }
});

router.patch('/updateOrderStatus', requireAuth, async (req, res) => {
  try {
    const userData = req.body;
    console.log(userData.orderStatus);
    const result = await orderData.findByIdAndUpdate( userData.orderId , { orderStatus : userData.orderStatus } );

    if (result.nModified === 0) {
      return res.status(404).json({ message: 'Order not updated' });
    }
    res.json({ message: 'Order status updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating order status', error: error.message });
  }
});

router.get('/editProduct/:productId', requireAuth, async (req, res) => {
  try {
    if(req.session.admin){
    const productId = req.params.productId;
    const products = await productData.findById(productId);
    const categories = await categoryData.findById(productId);
    res.render('editProduct', { admin : req.session.user , products , categories });
  } else {
    res.redirect('/adminLogin');
  }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

router.post('/updateProduct/:productId', requireAuth, async (req, res) => {
  try {
    const productId = req.params.productId;
    const updatedProductData = req.body;

    await productData.findByIdAndUpdate(productId,updatedProductData);

    res.redirect('/adminHome'); 
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.patch('/productBlockStatus', requireAuth, async (req, res) => {
  try {
    let result;
    const blockStatus = await productData.findOne({ _id: req.body.id }, { blocked: 1, _id: 0 })
    if (blockStatus.blocked === true) {
      
      result = await productData.findByIdAndUpdate(req.body.id, { blocked: false });
    }
    else {
      result = await productData.findByIdAndUpdate(req.body.id, { blocked: true });
    }

    if (result.nModified === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'Product block status changed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error toggling product block status', error: error.message });
  }
});

router.post('/addCategory', requireAuth, async (req, res) => {
  try {
    const {
      productCategory,
    } = req.body;

    const category = new categoryData({
      productCategory: productCategory,
      blocked: false,
    });

    const result = await category.save();
    res.redirect('/adminHome');
  } catch (error) {
    res.render('adminHome', { error: 'Error fetching user data.' });
  }
});

router.patch('/categoryBlockStatus', requireAuth, async (req, res) => {
  try {
    let result;
    const blockStatus = await categoryData.findOne({ _id: req.body.id }, { blocked: 1, _id: 0 })
    if (blockStatus.blocked === true) {
      result = await categoryData.findByIdAndUpdate(req.body.id, { blocked: false });
    }
    else {
      result = await categoryData.findByIdAndUpdate(req.body.id, { blocked: true });
    }

    if (result.nModified === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'Category block status changed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error toggling category block status', error: error.message });
  }
});

router.get('/logout', async(req, res) => {
  try {
  const { admin } = req.session;
  if (admin) {
    admin.adminStatus = 'logged-out';
    req.session.destroy();
    res.redirect('/adminLogin');
  }
  } catch (error) {
    res.render('/adminLogin', { error: 'Error logging in' });
  }
});

module.exports = router;