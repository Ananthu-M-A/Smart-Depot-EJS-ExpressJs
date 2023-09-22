const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');


const AdminController = require("../controllers/AdminController");

router.get('/', AdminController.loadLoginPage);
router.post('/', AdminController.login);

module.exports = router;