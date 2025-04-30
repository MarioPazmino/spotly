// src/utils/logger.js
module.exports = {
    info: (message, meta = {}) => {
      console.log(`[INFO] ${message}`, JSON.stringify(meta));
    },
    error: (message, meta = {}) => {
      console.error(`[ERROR] ${message}`, JSON.stringify(meta));
    }
  };