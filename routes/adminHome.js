const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
let mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const productData = require('../models/productModel');
const UserLoginData = require('../models/userModel');
const categoryData = require('../models/categoryModel');
const orderData = require('../models/orderModel');
const requireAuth = require('../middlewares/isAuthenticatedAdmin');
const moment = require('moment');
const router = express.Router();
const networkTime = require('../middlewares/networkTime');
const Admin = require('../models/adminModel');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/productImage/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage });

router.get('/', requireAuth, async (req, res) => {
  try {
    const currentDate = moment().format('YYYY-MM-DD HH:mm:ss');
    const products = await productData.find().populate('productCategory');
    const users = await UserLoginData.find();
    const adminData = await Admin.findOne();
    const categories = await categoryData.find({},{productCategory: 1, _id: 0});
    const orders = await orderData.find().populate('products.productId').exec();
    let totalSales = 0;
    orders.forEach(order => {
      totalSales = order.total + totalSales;
    });    

    res.render('adminHome', { admin : req.session.admin , products, users, categories, orders, totalSales, adminData});
    }
  catch (error) {
    res.render('adminHome', { error: 'Error fetching user data.' });
  }
});

router.get('/adminAccount', requireAuth, async (req, res) => {
  try {
    const adminData = await Admin.findOne();
    res.render('adminAccount' , { admin : req.session.admin, adminData });
  } catch (error) {
    console.log(error);
    res.render('adminHome', { error: 'Error fetching user data.' });
  }
});

router.post('/updateAdminDetail', requireAuth, upload.single('image'), async (req, res) => {
  try {
    const imageName = req.file.filename;
    const adminData = {
      fullName: req.body.adminName,
      mobileNo: req.body.adminMobileNo,
      profileImageName: imageName,
    }
    const adminId = await Admin.findOne({ email: req.session.admin }, { _id: 1 });
    const result = await Admin.findByIdAndUpdate(adminId, adminData, { upsert: true });
    res.redirect('/adminHome/adminAccount');
  } catch (error) {
    console.log(error);
    res.render('adminHome', { error: 'Error fetching user data.' });
  }
});


router.post('/changePassword', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword, newPassword2 } = req.body;
    if (newPassword !== newPassword2) {
      console.log('Incorrect password');
      return res.redirect('/adminHome/adminAccount');
    }

    const email = req.session.admin;
    const admin = await Admin.findOne({ email: email }, { password: 1 });
    const passwordMatch = await bcrypt.compare(currentPassword, admin.password);

    if (passwordMatch) {
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      const updatePassword = await Admin.findOneAndUpdate({ email: email }, { password: hashedNewPassword });

      if (updatePassword.nModified !== 0) {
        return res.redirect('/adminHome/adminAccount');
      } else {
        res.redirect('/adminHome/logout');
      }
    }else{
      res.redirect('/adminHome/logout');
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
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


router.post('/addProduct', upload.array('images', 4), async (req, res) => {
  try {
    const {
      productName,
      productBrand,
      productQuality,
      productCategory,
      productPrice,
      productStock,
      productDescription,
    } = req.body;

    const categoryId = await categoryData.findOne({ productCategory: productCategory }, { _id: 1 });
    
    const productImageNames = req.files.map(file => file.filename);

    const newProduct = new productData({
      productName,
      productBrand,
      productQuality,
      productCategory: categoryId,
      productPrice,
      productStock,
      productDescription,
      productImageNames,
      blocked: false,
    });

    await newProduct.save();
    return res.redirect('/adminHome');
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ error: 'Could not add product' });
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

    const categoryId = await categoryData.findOne({productCategory: productCategory}, {_id: 1});

    const imageNames = req.files.map(file => file.filename);

    const productId = req.params.productId;
    const updatedProduct = {
      productName: productName,
      productCategory: categoryId,
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
    const result = await orderData.findByIdAndUpdate( userData.orderId , { orderStatus : userData.orderStatus } );

    if(userData.orderStatus === "Order Delivered")
    {
      const result1 = await orderData.findByIdAndUpdate( userData.orderId , { returnOption : true } );

      const deliveredDate = moment(networkTime.date).format('YYYY-MM-DD HH:mm:ss');

      const result2 = await orderData.findOneAndUpdate({ _id: userData.orderId },
        { deliveredDate: deliveredDate },{ upsert: true, new: true });
    }

    if (result.nModified === 0) {
      return res.status(404).json({ message: 'Order status not updated' });
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
    const products = await productData.findOne({_id: productId}).populate('productCategory');
    const categories = await categoryData.find({},{productCategory: 1, _id: 0});
    const adminData = await Admin.findOne();

    res.render('editProduct', { admin : req.session.user , products , categories, adminData });
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

    const category = await categoryData.findOne({productCategory: productCategory});
    
    if(category)
    {
      return res.redirect('/adminHome');
    }

    const newCategory = new categoryData({
      productCategory: productCategory,
      blocked: false,
    });
    const result = await newCategory.save();
    res.redirect('/adminHome');
  } catch (error) {
    console.log(error);
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