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
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  blocked: {
    type: Boolean,
    required: true,
  },
});

const UserLoginData = mongoose.model('userLoginData', user);
module.exports = UserLoginData;