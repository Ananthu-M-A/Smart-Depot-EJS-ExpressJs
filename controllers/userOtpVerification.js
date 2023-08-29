const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'smartdepot494@gmail.com',
    pass: 'blqgqcjawbilmdmn'
  }
});

module.exports = transporter;
