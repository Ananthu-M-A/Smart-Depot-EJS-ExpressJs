const bcrypt = require('bcrypt');
const path = require('path');
const moment = require('moment');
const sharp = require('sharp');
let mongoose = require('mongoose');

const productData = require('../models/productModel');
const userLoginData = require('../models/userModel');
const categoryData = require('../models/categoryModel');
const Admin = require('../models/adminModel');
const orderData = require('../models/orderModel');


const networkTime = require('../middlewares/networkTime');

exports.loadLoginPage = function (req, res) {
    if(!req.session.admin || req.session.adminStatus !== 'logged-in'){
      res.render('adminLogin');
      } else {
      res.redirect('\admin');
      }
};


exports.login = async (req, res, next) => {
    const { email, password } = req.body;
    try {
      const admin = await Admin.findOne({ email });
      const passwordMatch = await bcrypt.compare(password, admin.password);
      if((admin.email === email)&&(passwordMatch))
      {
        req.session.admin = email;
        req.session.adminStatus = 'logged-in';
        return res.redirect('/admin');
      }
       else {
        res.status(401).send('Invalid credentials');
      }
    } catch (error) {
      console.error('Error during login:', error);
      res.status(500).send('Internal server error');
    }
};

exports.loadHomePage = async (req, res) => {
    try {
      const currentDate = moment().format('YYYY-MM-DD HH:mm:ss');
      const products = await productData.find().populate('productCategory');
      const users = await userLoginData.find();
      const adminData = await Admin.findOne();
      const categories = await categoryData.find();
      const offerProducts = await productData.find({offerType: "Product Offer"}).sort({ offerStart : -1 });
      const offerCategories = await categoryData.find({offerType: "Category Offer"}).sort({ offerStart : -1 });

      // const orders = await orderData.find().populate('products.productId').sort({ orderDate: -1 }).exec()
      const orders = await orderData.find()
      .populate('userId')
      .populate('products.productId')
      .populate('billingAddress')
      .populate('shippingAddress')
      .sort({ orderDate : -1 })
      .exec();
      let totalSales = 0;
      orders.forEach(order => {
        totalSales = order.total + totalSales;
      });    
      res.render('adminHome', { admin : req.session.admin , products, users, categories, orders, totalSales, adminData, offerCategories, offerProducts});
      }
    catch (error) {
      console.log(error);
      res.render('adminHome', { error: 'Error fetching user data.' });
    }
};

exports.loadAccount = async (req, res) => {
    try {
      const adminData = await Admin.findOne();
      res.render('adminAccount' , { admin : req.session.admin, adminData });
    } catch (error) {
      console.log(error);
      res.render('adminHome', { error: 'Error fetching user data.' });
    }
};
  

exports.updateAccount = async (req, res) => {
    try {
      const imageName = req.file.filename;
      const adminData = {
        fullName: req.body.adminName,
        mobileNo: req.body.adminMobileNo,
        profileImageName: imageName,
      }
      const adminId = await Admin.findOne({ email: req.session.admin }, { _id: 1 });
      const result = await Admin.findByIdAndUpdate(adminId, adminData, { upsert: true });
      res.redirect('/admin/adminAccount');
    } catch (error) {
      console.log(error);
      res.render('adminHome', { error: 'Error fetching user data.' });
    }
};
  
exports.changePassword = async (req, res) => {
    try {
      const { currentPassword, newPassword, newPassword2 } = req.body;
      if (newPassword !== newPassword2) {
        console.log('Incorrect password');
        return res.redirect('/admin/adminAccount');
      }
  
      const email = req.session.admin;
      const admin = await Admin.findOne({ email: email }, { password: 1 });
      const passwordMatch = await bcrypt.compare(currentPassword, admin.password);
  
      if (passwordMatch) {
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        const updatePassword = await Admin.findOneAndUpdate({ email: email }, { password: hashedNewPassword });
  
        if (updatePassword.nModified !== 0) {
          return res.redirect('/admin/adminAccount');
        } else {
          res.redirect('/admin/logout');
        }
      }else{
        res.redirect('/admin/logout');
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
};  

exports.loadProducts = async (req, res) => {
    try {
      res.render('adminHome' , { admin : req.session.admin });
    }
    catch (error) {
      res.render('adminHome', { error: 'Error fetching user data.' });
    }
};

exports.addProduct = async (req, res) => {
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
      return res.redirect('/admin');
    } catch (error) {
      console.error('Error adding product:', error);
      res.status(500).json({ error: 'Could not add product' });
    }
};
  
exports.updateProduct = async (req, res) => {
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

      let imageNames = req.files.map(file => file.filename);
      if(imageNames.length === 0)
      {
        imageNames = undefined;
      }
  
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
  
      res.redirect('/admin');
    } catch (error) {
      res.render('adminHome', { error: 'Error updating the product.' });
    }
};
  
exports.updateUserBlockStatus = async (req, res) => {
    try {
      let result;
      const blockStatus = await userLoginData.findOne({ _id: req.body.id }, { blocked: 1, _id: 0 });
      if (blockStatus.blocked === true) {
        
        result = await userLoginData.findByIdAndUpdate(req.body.id, { blocked: false });
      }
      else {
        result = await userLoginData.findByIdAndUpdate(req.body.id, { blocked: true });
      }
  
      if (result.nModified === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json({ message: 'User block status changed successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error toggling user admin status', error: error.message });
    }
};
  
exports.updateOrderStatus =  async (req, res) => {
    try {
      console.log('1');
      const userData = req.body;
      console.log(userData);
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
      console.log(error);
      res.status(500).json({ message: 'Error updating order status', error: error.message });
    }
};

exports.loadEditProducts = async (req, res) => {
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
};
  
 
exports.updateProductBlockStatus =  async (req, res) => {
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
};
  
exports.addCategory = async (req, res) => {
    try {
      const {
        productCategory,
      } = req.body;
  
      const category = await categoryData.findOne({productCategory: productCategory});
      
      if(category)
      {
        return res.redirect('/admin');
      }
  
      const newCategory = new categoryData({
        productCategory: productCategory,
        blocked: false,
      });
      const result = await newCategory.save();
      res.redirect('/admin');
    } catch (error) {
      console.log(error);
      res.render('adminHome', { error: 'Error fetching user data.' });
    }
};

exports.updateCategoryBlockStatus =  async (req, res) => {
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
};

exports.applyOffer = async(req, res) => {
  try {
    const { offerName, productId, categoryId, offerValue, offerStart, offerEnd } = req.body;
    const startDate = moment(offerStart).format('YYYY-MM-DD');
    const endDate = moment(offerEnd).format('YYYY-MM-DD');

    if(productId){
      const productOffer = {
      offerName: offerName, 
      offerType: "Product Offer", 
      offerValue: offerValue,
      offerStart: startDate, 
      offerEnd: endDate,
      offerStatus: "Active"
    };
    const result = await productData.findOneAndUpdate({_id: productId},productOffer,{upsert: true});
    } else if(categoryId) {
      const categoryOffer = {
      offerName: offerName, 
      offerType: "Category Offer", 
      offerValue: offerValue,
      offerStart: startDate, 
      offerEnd: endDate,
      offerStatus: "Active"
    };
    const result = await categoryData.findOneAndUpdate({_id: categoryId},categoryOffer,{upsert: true});
    }
    res.redirect('/admin')
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error applying offer', error: error.message });
  }
}

  
exports.logout =  async(req, res) => {
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
};