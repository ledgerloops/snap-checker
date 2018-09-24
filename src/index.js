var PeerHandler = require('./peerhandler')
var Hubbie = require('hubbie')

function Agent (myNick, mySecret, credsHandler) {
  this._myNick = myNick
  this._mySecret = mySecret
  this._peerHandlers = {}
  this._preimages = {}
  this.hubbie = new Hubbie();
  this.hubbie.listen({ myName: myNick });
  this.hubbie.on('peer', credsHandler);
  this.hubbie.on('message', (peerNick, msg) => {
    if (!this._peerHandlers[peerNick]) {
      this.ensurePeer(peerNick);
    }
    let msgObj;
    try {
      msgObj = JSON.parse(msg);
    } catch (e) {
      console.error('msg not JSON', peerNick, msg);
      return;
    }
    console.log('calling handleMessage, incoming')
    this._peerHandlers[peerNick]._ledger.handleMessage(msgObj, false);
  });
}

Agent.prototype = {
  ensurePeer: function (peerNick) {
    if (typeof this._peerHandlers[peerNick] === 'undefined') {
      console.log('agent gets new peer handler', peerNick)
      this._peerHandlers[peerNick] = new PeerHandler(peerNick, this._myNick, 'UCR', this);
    }
  },
  addClient: function(options) {
    this.ensurePeer(options.peerNick);
    return this.hubbie.addClient(Object.assign({
      myNick: this._myNick,
      mySecret: this._mySecret
    }, options));
  },
  listen: function (options) {
    return this.hubbie.listen(options);
  }
};

module.exports = {
  Agent
}
