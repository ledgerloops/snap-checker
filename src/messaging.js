var Messaging = require('hubbie').Messaging;

// singleton for in-process messaging between agents:

module.exports = new Messaging();
