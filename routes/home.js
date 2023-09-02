let express = require('express');
let router = express.Router();
const productData = require('../models/productModel');
const categoryData = require('../models/categoryModel');
const requireAuth = require('../middlewares/isAuthenticatedUser');
const isUserBlocked = require('../middlewares/isUserBlocked');

router.get('/', requireAuth, isUserBlocked, async(req, res) => {
  try {
    const products = await productData.find(); 
    const categories = await categoryData.find();
    res.render('home', { user: req.session.user , products , categories }); 
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

router.get('/cart', requireAuth, async(req, res) => {
  try {
    const products = await productData.find(); 
    res.render('cart', { user: req.session.user , products }); 
  } catch (error) {
    res.render('cart', { error: 'Error fetching product data.' });
  }
});

router.get('/checkout', requireAuth, async(req, res) => {
  try {
    res.render('checkout', { user: req.session.user}); 
  } catch (error) {
    res.render('checkout', { error: 'Error fetching product data.' });
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