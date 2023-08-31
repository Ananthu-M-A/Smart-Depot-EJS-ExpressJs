let express = require('express');
let router = express.Router();
const productData = require('../models/productModel');
const categoryData = require('../models/categoryModel');


router.get('/', async(req, res) => {
  try {
    if(req.session.user){
    const products = await productData.find(); 
    const categories = await categoryData.find();
    res.render('home', { user: req.session.user , products , categories }); 
    } else {
      res.redirect('/login');
    }
  } catch (error) {
    res.render('home', { error: 'Error fetching product data.' });
  }
});

router.get('/productDetails/:productId', async(req, res) => {
  try {
    if(req.session.user){
    const productId = req.params.productId;
    const fetchedProduct = await productData.findById(productId);
    res.render('productDetail', { user: req.session.user, product : fetchedProduct }); 
    } else {
      res.redirect('/login');
    }
  } catch (error) {
    res.render('home', { error: 'Error fetching product data.' });
  }
});

router.get('/cart', async(req, res) => {
  try {
    if(req.session.user){
    const products = await productData.find(); 
    console.log(req.session.user);
    res.render('cart', { user: req.session.user , products }); 
    } else {
      res.redirect('/login');
    }
  } catch (error) {
    res.render('cart', { error: 'Error fetching product data.' });
  }
});
 
router.get('/logout', async(req, res) => {
  try {
    req.session.destroy();
    res.redirect('/login');
  } catch (error) {
    res.render('/login', { error: 'Error logging in' });
  }
});


module.exports = router;