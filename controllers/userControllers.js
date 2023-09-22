const registerUserWithOTP = async (req, res) => {
  try {
    const { fullname, email, mobile, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const otp = generateOTP();
    sendOTP(email, otp);

    const user = new UserLoginData({
      fullname,
      email,
      mobile,
      password: hashedPassword,
      blocked: false,
      otp
    });

    await user.save();

    res.redirect('/userLogin');
  } catch (error) {
    console.error(error.message);
    res.redirect('/');
  }
};

module.exports = { registerUserWithOTP };
