const ntpClient = require('ntp-client');

const networkTime = async(req, res, next) => {
    ntpClient.getNetworkTime("pool.ntp.org", 123, (err, date) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Error fetching NTP time");
      }
      req.ntpTime = date;
      next();
    });
  };

  module.exports = networkTime;
  