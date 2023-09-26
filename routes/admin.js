const express = require('express');
const multer = require('multer');
const router = express.Router();

const requireAuth = require('../middlewares/isAuthenticatedAdmin');
const uploadProfileImage = require('../middlewares/UploadProfileImage');
const uploadProductImages = require('../middlewares/UploadProductImages');

const AdminController = require('../controllers/AdminController');


router.get('/', requireAuth, AdminController.loadHomePage);
router.get('/adminAccount', requireAuth, AdminController.loadAccount);
router.post('/updateAdminDetail', requireAuth, uploadProfileImage.single('image'), AdminController.updateAccount);
router.post('/changePassword', requireAuth, AdminController.changePassword);
router.get('/products', requireAuth, AdminController.loadProducts);
router.post('/addProduct', uploadProductImages.array('images', 4), AdminController.addProduct);
router.post('/updateProduct/:productId', requireAuth, uploadProductImages.array('images',4), AdminController.updateProduct);
router.patch('/userBlockStatus', requireAuth, AdminController.updateUserBlockStatus);
router.patch('/updateOrderStatus', requireAuth, AdminController.updateOrderStatus);
router.get('/editProduct/:productId', requireAuth, AdminController.loadEditProducts);
// router.post('/updateProduct/:productId', requireAuth, AdminController.updateProduct);
router.patch('/productBlockStatus', requireAuth, AdminController.updateProductBlockStatus);
router.post('/addCategory', requireAuth, AdminController.addCategory);
router.patch('/categoryBlockStatus', requireAuth, AdminController.updateCategoryBlockStatus);
router.post('/applyProductOffer', requireAuth, AdminController.applyProductOffer);
router.post('/applyCategoryOffer', requireAuth, AdminController.applyCategoryOffer);

router.get('/logout', AdminController.logout);

module.exports = router;