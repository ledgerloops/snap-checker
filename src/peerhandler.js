var Ledger = require('./ledger');

function PeerHandler(peerNick, myNick, unit, agent, medium) {
  this._ledger = new Ledger(peerNick, myNick, unit, agent, medium);
}

PeerHandler.prototype = {
  send: function(msg) {
    console.log('peerhandler send!', msg);
    return this._ledger.send(msg);
  },
  getBalance: function() {
    return this._ledger.getBalance();
  },
  considerProbe: function(thisBal, msg, peerNick) {
    return this._ledger.considerProbe(thisBal, msg, peerNick);
  },
  create: function(amount, hashHex, routeId) {
    return this._ledger.create(amount, hashHex, routeId);
  }
};

module.exports = PeerHandler;
