var PeerHandler = require('./peerhandler')
var Hubbie = require('hubbie')

const LEDGERLOOPS_PROTOCOL_VERSION = 'ledgerloops-0.8';

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
  this.hubbie.on('peer', (eventObj) => {
    if (eventObj.protocols && eventObj.protocols.indexOf( LEDGERLOOPS_PROTOCOL_VERSION ) == -1) {
      console.error('Client does not support ' + LEDGERLOOPS_PROTOCOL_VERSION, eventObj);
      return false;
    }
    if (credsHandler(eventObj)) {
      return LEDGERLOOPS_PROTOCOL_VERSION;
    }
  });
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
      mySecret: this._mySecret,
      protocols: [ LEDGERLOOPS_PROTOCOL_VERSION ]
    }, options));
  },
  listen: function (options) {
    return this.hubbie.listen(options);
  },
  create: function (peerName, amount, hashHex, routeId) {
    this.ensurePeer(peerName);
    return this._peerHandlers[peerName].create(amount, hashHex, routeId);
  },
  send: function(peerName, msgObj) {
    this.ensurePeer(peerName);
    return this._peerHandlers[peerName].send(msgObj);
  }
};

module.exports = {
  Agent
}
