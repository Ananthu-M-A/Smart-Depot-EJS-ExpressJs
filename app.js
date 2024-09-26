const createError = require('http-errors');
const express = require('express');
const session = require('express-session');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const razorpay = require('razorpay');

const userSignupRouter = require('./routes/userSignup');
const userLoginRouter = require('./routes/userLogin');
const adminLoginRouter = require('./routes/adminLogin');
const userRouter = require('./routes/user');
const adminRouter = require('./routes/admin');
const paymentRouter = require('./routes/payment');

const app = express();
dotenv.config();

const mongoUri = process.env.MONGODB_URI;
mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log("MongoDb Connected");
}).catch((err) => console.error('Could not connect to MongoDB', err));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'uploads')));

app.use('/userSignup', userSignupRouter);
app.use('/userLogin', userLoginRouter);
app.use('/adminLogin', adminLoginRouter);
app.use('/', userRouter);
app.use('/admin', adminRouter);
app.use('/payment', paymentRouter);

app.use(function (req, res, next) {
  next(createError(404));
});

app.use(function (err, req, res, next) {
  res.locals.message = err.message;

  if (req.app.get('env') === 'development') {
    res.locals.error = err;
  } else {
    res.locals.error = {};
  }
  res.status(err.status || 500);
  res.render('error');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

module.exports = app;