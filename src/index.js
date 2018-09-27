var PeerHandler = require('./peerhandler')
var Hubbie = require('hubbie')

function Agent (myName, mySecret, credsHandler) {
  if (!credsHandler) {
    credsHandler = () => true;
  }
  this._myName = myName
  this._mySecret = mySecret
  this._peerHandlers = {}
  this._preimages = {}
  this.hubbie = new Hubbie();
  this.hubbie.listen({ myName: myName });
  this.hubbie.on('peer', credsHandler);
  this.hubbie.on('message', (peerName, msg) => {
    if (!this._peerHandlers[peerName]) {
      this.ensurePeer(peerName);
    }
    let msgObj;
    try {
      msgObj = JSON.parse(msg);
    } catch (e) {
      console.error('msg not JSON', peerName, msg);
      return;
    }
    console.log('calling handleMessage, incoming')
    this._peerHandlers[peerName]._ledger.handleMessage(msgObj, false);
  });
}

Agent.prototype = {
  ensurePeer: function (peerName) {
    if (typeof this._peerHandlers[peerName] === 'undefined') {
      console.log('agent gets new peer handler', peerName)
      this._peerHandlers[peerName] = new PeerHandler(peerName, this._myName, 'UCR', this);
    }
  },
  addClient: function(options) {
    this.ensurePeer(options.peerName);
    return this.hubbie.addClient(Object.assign({
      myName: this._myName,
      mySecret: this._mySecret
    }, options));
  },
  listen: function (options) {
    return this.hubbie.listen(options);
  },
  create: function (peerName, amount, hashHex, routeId) {
    return this._peerHandlers[peerName].create(amount, hashHex, routeId);
  },
  send: function(peerName, msgObj) {
    return this._peerHandlers[peerName].send(msgObj);
  }
};

module.exports = {
  Agent
}
