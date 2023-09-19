const mongoose = require('mongoose');

const admin = mongoose.Schema({
  fullName: {
    type: String,
    required: true,
  },
  mobileNo: {
    type: Number,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required:true,
  },
  profileImageName: {
    type: String,
  },
});

const Admin = mongoose.model('adminLoginData', admin);
module.exports = Admin;