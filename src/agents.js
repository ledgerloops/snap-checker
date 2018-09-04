var messaging = require('./messaging');
var debug = require('./debug');
var Ledger = require('./ledgers');

function Agent(myNick) {
  this._myNick = myNick;
  this._ledgers = {};
  this._sentAdds = {};
  messaging.addChannel(myNick, (fromNick, msgStr) => {
    return this._handleMessage(fromNick, JSON.parse(msgStr));
  });
}

Agent.prototype._ensurePeer = function(peerNick) {
  if (typeof this._ledgers[peerNick] === 'undefined') {
    this._ledgers[peerNick] = new Ledger(peerNick, this._myNick);
  }
};

Agent.prototype._handleMessage = function(fromNick, msg) {
  debug.log('seeing', fromNick, msg);
};

Agent.prototype.sendAdd = function(creditorNick, amount, currency, waitForConfirmation) {
  this._ensurePeer(creditorNick);
  var msg = this._ledgers[creditorNick].createAdd(amount, currency);
  var promise = messaging.send(this._myNick, creditorNick, JSON.stringify(msg));
  if (waitForConfirmation) {
    return new Promise((resolve, reject) => {
     this._sentAdds[msg.msgId] = { resolve, reject };
    });
  } else {
    this._sentAdds[msg.msgId] = { resolve: function() {}, reject: function(err) { throw err; } };
    return promise;
  }
};

module.exports = Agent;
