var Hubbie = require('hubbie');
var Ledger = require('./ledger');
var Loops = require('./loops');

const LEDGERLOOPS_PROTOCOL_VERSION = 'ledgerloops-0.8';
const UNIT_OF_VALUE = 'UCR';

const INITIAL_RESEND_DELAY = 100;
const RESEND_INTERVAL_BACKOFF = 1.5;

function Agent (myName, mySecret, credsHandler) {
  if (!credsHandler) {
    credsHandler = () => true;
  }
  this._myName = myName
  this._mySecret = mySecret
  this._hubbie = new Hubbie();
  this._ledger = new Ledger(UNIT_OF_VALUE, myName);
  this._loops = new Loops(this);
  this._pendingOutgoingProposals = {};
  this._hubbie.listen({ myName: myName });
  this._hubbie.on('peer', (eventObj) => {
    if (eventObj.protocols && eventObj.protocols.indexOf( LEDGERLOOPS_PROTOCOL_VERSION ) == -1) {
      console.error('Client does not support ' + LEDGERLOOPS_PROTOCOL_VERSION, eventObj);
      return false;
    }
    if (credsHandler(eventObj)) {
      return LEDGERLOOPS_PROTOCOL_VERSION;
    }
  });
  this._hubbie.on('message', (peerName, msg) => {
    let msgObj;
    try {
      msgObj = JSON.parse(msg);
    } catch (e) {
      console.error('msg not JSON', peerName, msg);
      return;
    }
    switch (msgObj.msgType) {
      case 'ADD':
      case 'COND': {
        this._ledger.logMsg(peerName, msgObj, false).catch((err) => {
          console.log('incoming request was rejected by us', err);
        });
        this._handleRequestMsg(peerName, msgObj);
        break;
      }
      case 'ACK':
      case 'FULFILL':
      case 'REJECT': {
        this._ledger.logMsg(peerName, msgObj, false);
        this._handleResponseMsg(peerName, msgObj);
        break;
      }
      default: {
        this._loops.handleControlMessage(peerName, msgObj);
      }
    };
  });
}

Agent.prototype = {
  _handleRequestMsg: function (peerName, msgObj) {
    console.log('received request', { msgObj, peerName});
    const repeatResponse = this._ledger.getResponse(peerName, msgObj, false);
    if (repeatResponse) {
      this._hubbie.send(peerName, JSON.stringify(repeatResponse));
    } else {
      this._loops.getResponse(peerName, msgObj).then((responseMsgObj) => {
        this._hubbie.send(peerName, JSON.stringify(responseMsgObj));
        this._ledger.logMsg(peerName, responseMsgObj, true);
      });
    }
  },
  _handleResponseMsg: function (peerName, msgObj) {
    console.log('received response', { msgObj, peerName});
    this._ledger.logMsg(peerName, msgObj, false);
  },

  // private, to be called by Loops handler:
  _propose: function (peerName, amount, hashHex, routeId) {
    const msgObj = this._ledger.create(peerName, amount, hashHex, routeId);
    const promise = this._ledger.logMsg(peerName, msgObj, true);
    console.log(this._myName, 'proposing', peerName + '-' + msgObj.msgId);
    let resendDelay = INITIAL_RESEND_DELAY
    let resendTimer;
    const sendAndRetry = () => {
      this._hubbie.send(peerName, JSON.stringify(msgObj), true);
      resendDelay *= RESEND_INTERVAL_BACKOFF;
      resendTimer = setTimeout(sendAndRetry, resendDelay);
    };
    sendAndRetry();
    return promise.then((preimage) => {
      clearTimeout(resendTimer);
      return preimage;
    }).catch((err) => {
      clearTimeout(resendTimer);
      throw err;
    });
  },
  _sendCtrl: function(peerName, msgObj) {
    msgObj.protocol = LEDGERLOOPS_PROTOCOL_VERSION;
    return this._hubbie.send(peerName, JSON.stringify(msgObj));
  },

  // public:
  addClient: function(options) {
    return this._hubbie.addClient(Object.assign({
      myName: this._myName,
      mySecret: this._mySecret,
      protocols: [ LEDGERLOOPS_PROTOCOL_VERSION ]
    }, options));
  },
  listen: function (options) {
    return this._hubbie.listen(Object.assign({
      protocolName: LEDGERLOOPS_PROTOCOL_VERSION
    }, options));
  },
  addTransaction: function (peerName, amount) {
    return this._propose(peerName, amount);
  },
  getBalances: function() {
    return this._ledger.getBalances();
  },
  getTransactions: function() {
    return this._ledger.getTransactions();
  },
  payIntoNetwork: function(peerName, value) {
    return this._loops.payIntoNetwork(peerName, value);
  },
  receiveFromNetwork: function(peerName, value) {
    return this._loops.receiveFromNetwork(peerName, value);
  }
};

module.exports = {
  Agent
}
