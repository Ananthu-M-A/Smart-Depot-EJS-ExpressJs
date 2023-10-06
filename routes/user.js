const express = require('express');
const multer = require('multer');
const router = express.Router();

const requireAuth = require('../middlewares/isAuthenticatedUser');
const isUserBlocked = require('../middlewares/isUserBlocked');
const uploadProfileImage = require('../middlewares/UploadProfileImage');

const UserController = require('../controllers/UserController');

router.get('/', requireAuth, isUserBlocked, UserController.loadHomePage);
router.get('/search', requireAuth, isUserBlocked, UserController.searchProducts);
router.post('/filterProducts', requireAuth, isUserBlocked, UserController.filterProducts);
router.get('/clearFilter', requireAuth, isUserBlocked, UserController.clearFilter);
router.get('/productDetails', requireAuth, isUserBlocked, UserController.loadProductDetail);
router.get('/cart', requireAuth, isUserBlocked, UserController.loadCart);
router.get('/removeCartItem/:productId', requireAuth, isUserBlocked, UserController.removeCartItem);
router.post('/applyOffer', requireAuth, isUserBlocked, UserController.applyOffer);
router.get('/wishlist', requireAuth, isUserBlocked, UserController.loadWishlist);
router.get('/wallet',requireAuth, isUserBlocked, UserController.loadWallet);
router.get('/removeWishlistItem/:productId', requireAuth, isUserBlocked, UserController.removeWishlistItem);
router.get('/orders', requireAuth, isUserBlocked, UserController.loadOrders);
router.get('/cancelOrder/:orderId', requireAuth, isUserBlocked, UserController.cancelOrder);
router.get('/orderDetail/:orderId', requireAuth, isUserBlocked, UserController.loadOrderDetail);
router.get('/account', requireAuth, isUserBlocked, UserController.loadAccount);
router.post('/updateLoginData', requireAuth, uploadProfileImage.single('image'), UserController.updateLoginData);
router.post('/addBillingAddress', requireAuth, UserController.addBillingAddress);
router.post('/addShippingAddress', requireAuth, UserController.addShippingAddress);
router.post('/updateBillingAddress', requireAuth, UserController.updateBillingAddress);
router.post('/updateShippingAddress', requireAuth, UserController.updateShippingAddress);
router.post('/changePassword', requireAuth, UserController.changePassword);
router.post('/deleteAccount', requireAuth, UserController.deleteAccount);
router.post('/cart/:productId', requireAuth, UserController.addToCart);
router.post('/changeQuantity/:productId/:productQuantity', requireAuth, UserController.changeQuantity);
router.post('/wishlist/:productId', UserController.addToWishlist);
router.post('/checkout/:subTotal/:total/:discount', requireAuth, UserController.loadCheckout);
router.post('/updateOrderStatus/:orderId', requireAuth, UserController.updateReturnStatus);
router.post('/placeOrder/:subTotal/:total/:discount', requireAuth, UserController.placeOrder);
router.get('/orderConfirmation', requireAuth, UserController.loadOrderConfirmation);
router.get('/logout', UserController.logout);
router.get('/downloadInvoice/:orderId/:total', UserController.downloadInvoice);


module.exports = router;
