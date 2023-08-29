let express = require('express');
let router = express.Router();
const productData = require('../models/productModel');

router.get('/', async(req, res) => {
  try {
    const products = await productData.find(); 
    res.render('home', { products }); 
  } catch (error) {
    res.render('home', { error: 'Error fetching product data.' });
  }
});

router.get('/productDetails/:productId', async(req, res) => {
  try {
    const productId = req.params.productId;
    const fetchedProduct = await productData.findById(productId);
    res.render('productDetail', { product : fetchedProduct }); 
  } catch (error) {
    res.render('home', { error: 'Error fetching product data.' });
  }
});


module.exports = router;