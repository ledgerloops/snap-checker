var Hubbie = require('hubbie');
var Ledger = require('./ledger');
var Loops = require('ledgerloops');

const LEDGERLOOPS_PROTOCOL_VERSION = 'SNAP-1.0';
const UNIT_OF_VALUE = 'UCR';

const INITIAL_RESEND_DELAY = 100;
const RESEND_INTERVAL_BACKOFF = 1.5;

function Agent (myName, mySecret, credsHandler, db) {
  this.busy = 0;
  if (!credsHandler) {
    credsHandler = () => Promise.resolve(true);
  }
  if (!db) {
    db = () => true;
  }
  this._myName = myName
  this._mySecret = mySecret
  this._hubbie = new Hubbie();
  this._ledger = new Ledger(UNIT_OF_VALUE, myName, db);
  this._loops = new Loops(this);
  this._pendingOutgoingProposals = {};
  this._hubbie.listen({ myName: myName });
  this._hubbie.on('peer', (eventObj) => {
    // console.log('got hubbie peer', eventObj);
    if (eventObj.protocols && eventObj.protocols.indexOf( LEDGERLOOPS_PROTOCOL_VERSION ) == -1) {
      console.error('Client does not support ' + LEDGERLOOPS_PROTOCOL_VERSION, eventObj);
      return Promise.resolve(false);
    }
    const promise = credsHandler(eventObj);
    // console.log({ promise });
    return promise;
  });
  this._hubbie.on('message', (peerName, msg) => {
    this.busy++;
    console.log(`${peerName}->${this._myName}`, msg);
    let msgObj;
    try {
      msgObj = JSON.parse(msg);
    } catch (e) {
      console.error('msg not JSON', peerName, msg);
      this.busy--;
      return;
    }
    switch (msgObj.msgType) {
      case 'PROPOSE': {
        Promise.all([
          this._ledger.logMsg(peerName, msgObj, false).catch((err) => {
            // console.log('incoming request was rejected by us', err);
          }),
          this._handleRequestMsg(peerName, msgObj)
        ]).then(() => {
          this.busy--;
        });
        break;
      }
      case 'ACCEPT':
      case 'REJECT': {
        Promise.all([
          this._ledger.logMsg(peerName, msgObj, false),
          this._handleResponseMsg(peerName, msgObj)
        ]).then(() => {
          this.busy--;
        });
        break;
      }
      default: {
        this._loops.handleControlMessage(peerName, msgObj);
        this.busy--;
      }
    };
  });
}

Agent.prototype = {
  _handleRequestMsg: function (peerName, msgObj) {
    // console.log('received request', { msgObj, peerName});
    const repeatResponse = this._ledger.getResponse(peerName, msgObj, false);
    if (repeatResponse) {
      return this._hubbie.send(peerName, JSON.stringify(repeatResponse));
    }
    this.busy++;
    return this._loops.getResponse(peerName, msgObj).then((result) => {
      this.busy--;
      if (typeof result == 'object') {; // FIXME: make LedgerLoops module return only preimage
        return result;
      }
      return {
        msgType: 'ACCEPT',
        msgId: msgObj.msgId,
        preimage: result
      };
    }).catch((err) => {
      this.busy--;
      return {
        msgType: 'REJECT',
        msgId: msgObj.msgId,
        reason: err.message
      };
    }).then((responseMsgObj) => {
      return Promise.all([
        this._hubbie.send(peerName, JSON.stringify(responseMsgObj)),
        this._ledger.logMsg(peerName, responseMsgObj, true)
      ]);
    });
  },
  _handleResponseMsg: function (peerName, msgObj) {
    // console.log('received response', { msgObj, peerName});
    this._ledger.logMsg(peerName, msgObj, false);
  },

  // private, to be called by Loops handler:
  _propose: function (peerName, amount, hashHex, routeId) {
    const msgObj = this._ledger.create(peerName, amount, hashHex, routeId);
    const promise = this._ledger.logMsg(peerName, msgObj, true);
    // console.log(this._myName, 'proposing', peerName + '-' + msgObj.msgId);
    let resendDelay = INITIAL_RESEND_DELAY
    let resendTimer;
    const sendAndRetry = () => {
      this._hubbie.send(peerName, JSON.stringify(msgObj));
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
  Agent,
  unregisterNames: Hubbie.unregisterNames
}
