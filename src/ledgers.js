function Ledger(peerNick, myNick) {
  this._peerNick = peerNick;
  this._myNick = myNick;
  this._debts = {};
  this._pendingDebts = {};
  this._history = [];
  this.nextId = 0;
}

Ledger.prototype = {
  createAdd: function(amount, unit) {
    return {
      msgType: 'ADD',
      msgId: this.nextId++,
      beneficiary: 'you',
      amount,
      unit
    };
  }
};

module.exports = Ledger;
