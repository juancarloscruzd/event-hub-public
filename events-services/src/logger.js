var winston = require("winston");

const logger = new winston.createLogger({
  transports: [
    new winston.transports.Console({
      timestamp: true,
      colorize: true
    })
  ]
});

logger.level = process.env.LOG_LEVEL || "silly";

logger.stream = {
  write: function(message) {
    logger.info(message);
  }
};

module.exports = logger;
