const debug = require('./debug');
var messaging = require('./messaging');

function Ledger(peerNick, myNick, unit, agent) {
  this._peerNick = peerNick;
  this._myNick = myNick;
  this._unit = unit;
  this._currentBalance = {
    [peerNick]: 0,
    [myNick]: 0
  };
  this._pendingBalance = {
    [peerNick]: 0,
    [myNick]: 0
  };
  this._committed = {};
  this._pendingMsg = {};
  this._pendingCond = {};
  this._probesSeen = { fwd: [], rev: [] };
  this._agent = agent;
  this.myNextId = 0;
  this._sentAdds = {};
  this.doSend = messaging.addChannel(peerNick, myNick, (msgStr) => {
    return this._handleMessage(JSON.parse(msgStr));
  });
  this.send = (msg) => {
    debug.log('ledger doing send!', { myNick, peerNick, msg });
    this.doSend(msg);
  };
}

Ledger.prototype = {
  _handleMessage: function(msg) {
    debug.log('seeing', this._peerNick, msg);
    this.handleMessage(msg);
    if (msg.msgType === 'ADD') {
      const reply = {
        msgType: 'ACK',
        msgId: msg.msgId,
        sender: this._peerNick
      };
      this.handleMessage(reply);
      this.send(JSON.stringify(reply));
      this._agent._createProbe(this._peerNick); // peer now owes me money, so I'll send them a rev probe
    } else if (msg.msgType === 'COND') {
      if (msg.msgId > 20) { panic(); }
      setTimeout(() => this._agent._handleCond(this._peerNick, msg), 100);
    } else if (msg.msgType === 'FULFILL') {
      this._handleFulfill(msg);
    } else if (msg.msgType === 'PROBE') {
      this._agent._handleProbe(this._peerNick, msg);
    }
  },
  create: function(amount, condition, routeId) {
    if (condition) {
      return {
        msgType: 'COND',
        msgId: this.myNextId++,
        beneficiary: this._peerNick,
        sender: this._myNick,
        amount,
        unit: this._unit,
        condition,
        routeId
      };
    } else {
      return {
        msgType: 'ADD',
        msgId: this.myNextId++,
        beneficiary: this._peerNick,
        sender: this._myNick,
        amount,
        unit: this._unit
      };
    }
  },
  handleMessage: function(msg) {
    debug.log('Handling', msg);
    switch(msg.msgType) {
      case 'ADD':
      case 'COND': {
        this._pendingBalance[msg.beneficiary] += msg.amount;
        this._pendingMsg[`${msg.sender}-${msg.msgId}`] = msg;
        debug.log('COND - COND - COND', this._myNick, this._pendingMsg);
        break;
      }
      case 'ACK':
      case 'FULFILL': {
        const orig = this._pendingMsg[`${msg.sender}-${msg.msgId}`];
        // FIXME: both Agent and Ledger are now keeping a this._pendingMsg
        debug.log('FULFILL - FULFILL - FULFILL', this._myNick, this._pendingMsg);
        this._pendingBalance[orig.beneficiary] -= orig.amount;
        this._currentBalance[orig.beneficiary] += orig.amount;
        this._committed[`${msg.sender}-${msg.msgId}`] = this._pendingMsg[`${msg.sender}-${msg.msgId}`];
        delete this._pendingMsg[`${msg.sender}-${msg.msgId}`];
        debug.log('Committed', msg);
        break;
      }
      case 'REJECT':
      case 'REJECT-COND': {
        const orig = this._pendingMsg[`${msg.sender}-${msg.msgId}`];
        this._pendingBalance[orig.beneficiary] -= orig.amount;
        delete this._pendingMsg[`${msg.sender}-${msg.msgId}`];
        debug.log('Rejected', msg);
        break;
      }
    }
  },
  getBalance: function() {
    return this._currentBalance[this._myNick] - this._currentBalance[this._peerNick];
  },
  sendAdd: function(amount, currency, waitForConfirmation) {
    var msg = this.create(amount);
    this.handleMessage(msg);
    debug.log(this);
    var promise = this.send(JSON.stringify(msg));
    if (waitForConfirmation) {
      return new Promise((resolve, reject) => {
       this._sentAdds[msg.msgId] = { resolve, reject };
      });
    } else {
      this._sentAdds[msg.msgId] = { resolve: function() {}, reject: function(err) { throw err; } };
      return promise;
    }
  },
  _handleFulfill: function(msg) {
    // TODO: check whether the preimage is valid
    if (this._pendingCond[msg.msgId]) {
      const backer = this._pendingCond[msg.msgId].fromNick;
      debug.log('handling fulfill, backer found:', backer);
      // FIXME: sending this ACK after the FULFILL has already committed the transaction confuses things!
      // this.send(JSON.stringify({
      //   msgType: 'ACK',
      //   sender: this._myNick,
      //   msgId: msg.msgId
      // }));
      debug.log('cond-level orig:', this._pendingCond[msg.msgId]);
      const backMsg = {
        msgType: 'FULFILL',
        sender: backer,
        msgId: this._pendingCond[msg.msgId].msg.msgId,
        preimage: msg.preimage
      };
      this._agent._ledgers[backer].handleMessage(backMsg);
      debug.log(`Passing on FULFILL ${this._peerNick} -> ${this._myNick} -> ${backer}`, backMsg);
      this._agent._ledgers[backer].send(JSON.stringify(backMsg));
    } else {
      debug.log(this._myNick + ': cannot find backer, I must have been the loop initiator.');
    }
  },
  
  _handleReject: function(msg) {
  }
};

module.exports = Ledger;
