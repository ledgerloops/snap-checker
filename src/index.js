var PeerHandler = require('./peerhandler')
var Hubbie = require('hubbie')

function Agent (myNick, mySecret) {
  this._myNick = myNick
  this._mySecret = mySecret
  this._peerHandlers = {}
  this._preimages = {}
  this.hubbie = new Hubbie();
  this.hubbie.listen({ myName: myNick });
  this.hubbie.on('message', (peerNick, msg) => {
    if (this._peerHandlers[peerNick]) {
      this._peerHandlers[peerNick]._ledger.handleMessage(msg, false);
    }
  });
}

Agent.prototype = {
  ensurePeer: function (peerNick, channel) {
    if (typeof this._peerHandlers[peerNick] === 'undefined') {
      console.log('agent gets new peer handler', { peerNick, channel })
      this._peerHandlers[peerNick] = new PeerHandler(peerNick, this._myNick, 'UCR', this);
      if (typeof channel === 'string') {
        this.hubbie.addClient({
          peerName: peerNick,
          myName: this._myNick,
          mySecret: this._mySecret,
          peerUrl: channel
        });
      }
    }
  },
  listen: function (port, clientCreds) {
    this.hubbie.listen({ port });
    this.hubbie.on('peer', (eventObj) => {
      return (eventObj.peerSecret === clientCreds[eventObj.peerName]);
    });
  }
};

module.exports = {
  Agent
}
