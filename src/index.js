var verifyHash = require('./hashlocks').verifyHash;
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
  this._ledger = new Ledger(UNIT_OF_VALUE);
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
        this._ledger.markAsPending(peerName, msgObj, false);
        return this._loops.getResponse(peerName, msgObj).then((response) => {
          this._hubbie.send(peerName, JSON.stringify(response.msgObj));

          // resolvePending: function (peerName, orig, outgoing, commit) {
          return this._ledger.resolvePending(peerName, msgObj, false, response.commit);
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
        const orig = this._pendingOutgoingProposals[peerName + '-' + msgObj.msgId].msgObj;
        console.log('received ACK', { msgObj, orig });
        // resolvePending: function (peerName, orig, outgoing, commit) {
        this._ledger.resolvePending(peerName, orig, true, true);
        const resolve = this._pendingOutgoingProposals[peerName + '-' + msgObj.msgId].resolve;
        delete this._pendingOutgoingProposals[peerName + '-' + msgObj.msgId];
        resolve(msg.preimage);
        break;
      }
      case 'REJECT': {
        // resolvePending: function (peerName, orig, outgoing, commit) {
        this._ledger.resolvePending(peerName, msgObj, true, false);
        const reject = this._pendingOutgoingProposals[peerName + '-' + msgObj.msgId].reject;
        delete this._pendingOutgoingProposals[peerName + '-' + msgObj.msgId];
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
    const msgObj = this._ledger.create(peerName, amount, hashHex, routeId);
    this._ledger.markAsPending(peerName, msgObj, true);
    const promise = new Promise ((resolve, reject) => {
      this._pendingOutgoingProposals[peerName + '-' + msgObj.msgId] = { resolve, reject, msgObj };
    });
    console.log('proposing', peerName + '-' + msgObj.msgId);
    let resendDelay = INITIAL_RESEND_DELAY
    const sendAndRetry = () => {
      if (!this._pendingOutgoingProposals[peerName + '-' + msgObj.msgId]) {
        return;
      }
      this._hubbie.send(peerName, JSON.stringify(msgObj), true);
      resendDelay *= RESEND_INTERVAL_BACKOFF;
      setTimeout(sendAndRetry, resendDelay);
    };
    sendAndRetry();
    return promise;
  },
  _sendCtrl: function(peerName, msgObj) {
    msgObj.protocol = LEDGERLOOPS_PROTOCOL_VERSION;
    return this._hubbie.send(peerName, JSON.stringfify(msgObj));
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
