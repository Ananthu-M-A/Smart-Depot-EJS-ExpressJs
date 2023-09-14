let createError = require('http-errors');
let express = require('express');
const session = require('express-session');
let path = require('path');
let cookieParser = require('cookie-parser');
let logger = require('morgan');
let mongoose = require('mongoose');


let signupRouter = require('./routes/signup');
let loginRouter = require('./routes/login');
let adminLoginRouter = require('./routes/adminLogin');
let homeRouter = require('./routes/home');
let adminHomeRouter = require('./routes/adminHome');


mongoose.connect('mongodb://127.0.0.1:27017/smartDepot', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

let app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(session({
  secret: 'the_smart_depot',
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


app.use('/signup', signupRouter);
app.use('/login', loginRouter);
app.use('/adminLogin', adminLoginRouter);
app.use('/home', homeRouter);
app.use('/adminHome', adminHomeRouter);

app.use(function(req, res, next) {
  next(createError(404));
});

app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
