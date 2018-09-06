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
  this._pending = {};
  this._agent = agent;
  this.myNextId = 0;
  this._sentAdds = {};
  this.doSend = messaging.addChannel(peerNick, myNick, (msgStr) => {
    return this._agent._handleMessage(peerNick, JSON.parse(msgStr));
  });
  this.send = (msg) => {
    debug.log('ledger doing send!', { myNick, peerNick, msg });
    this.doSend(msg);
  };
}

Ledger.prototype = {
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
        this._pending[`${msg.sender}-${msg.msgId}`] = msg;
        debug.log('COND - COND - COND', this._myNick, this._pending);
        break;
      }
      case 'ACK':
      case 'FULFILL': {
        const orig = this._pending[`${msg.sender}-${msg.msgId}`];
        // FIXME: both Agent and Ledger are now keeping a this._pending
        debug.log('FULFILL - FULFILL - FULFILL', this._myNick, this._pending);
        this._pendingBalance[orig.beneficiary] -= orig.amount;
        this._currentBalance[orig.beneficiary] += orig.amount;
        this._committed[`${msg.sender}-${msg.msgId}`] = this._pending[`${msg.sender}-${msg.msgId}`];
        delete this._pending[`${msg.sender}-${msg.msgId}`];
        debug.log('Committed', msg);
        break;
      }
      case 'REJECT':
      case 'REJECT-COND': {
        const orig = this._pending[`${msg.sender}-${msg.msgId}`];
        this._pendingBalance[orig.beneficiary] -= orig.amount;
        delete this._pending[`${msg.sender}-${msg.msgId}`];
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
  }
};

module.exports = Ledger;
