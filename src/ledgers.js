const debug = require('./debug');

function Ledger(peerNick, myNick, unit) {
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
  this.myNextId = 0;
}

Ledger.prototype = {
  create: function(amount, condition) {
    if (condition) {
      return {
        msgType: 'COND',
        msgId: this.myNextId++,
        beneficiary: this._peerNick,
        sender: this._myNick,
        amount,
        unit: this._unit,
        condition
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
        debug.log('Added pending', msg);
        break;
      }
      case 'ACK':
      case 'FULFILL': {
        const orig = this._pending[`${msg.sender}-${msg.msgId}`];
        debug.log({ orig })
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
  }
};

module.exports = Ledger;
