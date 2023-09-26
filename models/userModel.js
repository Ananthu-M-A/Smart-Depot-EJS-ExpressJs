const mongoose = require('mongoose');

const user = mongoose.Schema({
  fullname: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  mobile: {
    type: Number,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  profileImageName: {
    type: String,
  },
  blocked: {
    type: Boolean,
    default: false,
  },
});

const userLoginData = mongoose.model('userLoginData', user);
module.exports = userLoginData;