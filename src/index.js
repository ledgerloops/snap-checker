var verifyHash = require('./hashlocks').verifyHash;
var Hubbie = require('hubbie');
var Ledger = require('./ledger');
var Loops = require('./loops');

const LEDGERLOOPS_PROTOCOL_VERSION = 'ledgerloops-0.8';

const INITIAL_RESEND_DELAY = 100;
const RESEND_INTERVAL_BACKOFF = 1.5;

function Agent (myName, mySecret, credsHandler) {
  if (!credsHandler) {
    credsHandler = () => true;
  }
  this._myName = myName
  this._mySecret = mySecret
  this._hubbie = new Hubbie();
  this._ledger = new Ledger();
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
        this._ledger.markPending(peerName, msgObj, false);
        this._loops.getResponse(peerName, msgObj).then((responseObj) => {
          return this._hubbie.send(peerName, JSON.stringify(responseObj));
        }).then(() => {
          this._ledger.resolvePending(peerName, responseObj, false);
        });
        break;
      }
      case 'FULFILL': {
        const orig = this._pendingOutgoingProposals[peerName + '-' + msgObj.msgId].msgObj;
        if (!orig) {
          console.log('unexpected fulfill!', msg, orig);
          return;
        }
        if (!verifyHash(msg.preimage, orig.condition)) {
          console.log('no hash match!', msg, orig);
          return;
        } else {
          console.log('hash match!');
        }
        // fall-through from FULFILL to ACK:
      }
      case 'ACK': {
        this._ledger.resolvePending(peerName, orig, true);
        const resolve = this._pendingOutgoingProposals[peerName + '-' + msgObj.msgId].resolve;
        delete this._pendingOutgoingProposals[peerName + '-' + msgObj.msId];
        resolve(msg.preimage);
        break;
      }
      case 'REJECT': {
        this._ledger.resolvePending(peerName, msgObj, true);
        const reject = this._pendingOutgoingProposals[peerName + '-' + msgObj.msgId].reject;
        delete this._pendingOutgoingProposals[peerName + '-' + msgObj.msId];
        reject(new Error(msg.reason));
        break;
      }
      default: {
        this._loops.handleControlMessage(peerName, msgObj);
      }
    };
  });
}

Agent.prototype = {

  // private, to be called by Loops handler:
  _propose: function (peerName, amount, hashHex, routeId) {
    const msgObj = this.ledger.create(peerName, amount, hashHex, routeId);
    this.ledger.markPending(peerName, msgObj, true);
    const promise = new Promise ((resolve, reject) => {
      this._pendingOutgoingProposals[peerName + '-' + msgObj.msId] = { resolve, reject, msgObj };
    });
    let resendDelay = INITIAL_RESEND_DELAY
    const sendAndRetry = () => {
      if (!this._pendingOutgoingProposals[peerName + '-' + msgObj.msId]) {
        return;
      }
      this.hubbie.send(peerName, msgObj, true);
      resendDelay *= RESEND_INTERVAL_BACKOFF;
      setTimeout(sendAndRetry, resendDelay);
    };
    sendAndRetry();
    return promise;
  },
  _sendCtrl: function(peerName, msgObj) {
    return this.hubbie.send(peerName, msgObj);
  },

  // public:
  addClient: function(options) {
    return this.hubbie.addClient(Object.assign({
      myName: this._myName,
      mySecret: this._mySecret,
      protocols: [ LEDGERLOOPS_PROTOCOL_VERSION ]
    }, options));
  },
  listen: function (options) {
    return this.hubbie.listen(Object.assign({
      protocolName: LEDGERLOOPS_PROTOCOL_VERSION
    }, options));
  },
  addTransaction: function (peerName, amount) {
    return this._propose(peerName, amount);
  }
};

module.exports = {
  Agent
}
