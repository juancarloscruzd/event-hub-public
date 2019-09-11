var winston = require("winston");

const logger = new winston.createLogger({
  transports: [
    new winston.transports.Console({
      timestamp: true,
      colorize: true
    })
  ]
});

logger.stream = {
  // eslint-disable-next-line no-unused-vars
  write: function(message, _encoding) {
    logger.info(message);
  }
};

module.exports = logger;
