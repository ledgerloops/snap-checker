function Ledger (unit) {
  this._unit = unit
  this._balance = {};
  this._committed = {}
  this._pendingMsg = {}
  this.myNextId = {}
}

Ledger.prototype = {
  create: function (peerName, amount, condition, routeId) {
    if (!this.myNextId[peerName]) {
      this.myNextId[peerName] = 0;
    }
    if (condition) {
      return {
        msgType: 'COND',
        msgId: this.myNextId[peerName]++,
        amount,
        unit: this._unit,
        condition,
        routeId
      }
    } else {
      return {
        msgType: 'ADD',
        msgId: this.myNextId[peerName]++,
        amount,
        unit: this._unit
      }
    }
  },
  addBalance: function (party, account, amount) {
    console.log('addBalance', { party, account, amount });
 
    if (!this._balance[party]) {
      this._balance[party] = {
        current: 0,
        receivable: 0,
        payable: 0
      };
    }
    this._balance[party][account] += amount;
  },
  getBalances: function () {
    return this._balance;
  },
  getTransactions: function () {
    return {
      committed: this._committed,
      pending: this._pending
    };
  },
  getLowerPeers: function (limit) {
    let list = [];
    for (let peerName in this._balance) {
      // imagine all this peer's receivables succeed, and all his payables fail: 
      const highestBalanceEstimate = this._balance[peerName].current + this._balance[peerName].receivable;
      if (highestBalanceEstimate < limit) {
        list.push([peerName, highestBalanceEstimate]);
      }
    }
    return list.sort((a, b) => b[1] - a[1]); // lowest first
  },
  getHigherPeers: function (limit) {
    let list = [];
    for (let peerName in this._balance) {
      // imagine all this peer's receivables fail, and all his payables succeed: 
      const lowestBalanceEstimate = this._balance[peerName].current - this._balance[peerName].payable;
      if (lowestBalanceEstimate > limit) {
        list.push([peerName, lowestBalanceEstimate]);
      }
    }
    return list.sort((a, b) => a[1] - b[1]); // highest first
  },
  markAsPending: function (peerName, msgObj, outgoing) {
    const proposer = (outgoing ? 'bank' : peerName);
    const beneficiary = (outgoing ? peerName : 'bank');
    if (this._pendingMsg[`${proposer}-${beneficiary}-${msgObj.msgId}`]) {
      console.log('this was a resend');
      return false;
    }
    console.log(`Bank marks-As-Pending message ${(outgoing ? 'to' : 'from')} ${peerName}`, msgObj);
    this.addBalance(proposer, 'payable', msgObj.amount);
    this.addBalance(beneficiary, 'receivable', msgObj.amount);
    this._pendingMsg[`${proposer}-${beneficiary}-${msgObj.msgId}`] = msgObj
    this._pendingMsg[`${proposer}-${beneficiary}-${msgObj.msgId}`].date = new Date().getTime();
    return true;
  },
  resolvePending: function (peerName, orig, outgoing, commit) {
    console.log(`Bank resolves-Pending message ${(outgoing ? 'to' : 'from')} ${peerName}`, orig, { commit });
    const proposer = (outgoing ? 'bank' : peerName);
    const beneficiary = (outgoing ? peerName : 'bank');
    this.addBalance(proposer, 'payable', -orig.amount);
    this.addBalance(beneficiary, 'receivable', -orig.amount);
    if (commit) {
      this.addBalance(proposer, 'current', -orig.amount);
      this.addBalance(beneficiary, 'current', orig.amount);

      this._committed[`${proposer}-${beneficiary}-${orig.msgId}`] = this._pendingMsg[`${proposer}-${beneficiary}-${orig.msgId}`]
      this._committed[`${proposer}-${beneficiary}-${orig.msgId}`].date = new Date().getTime();
    }
    delete this._pendingMsg[`${proposer}-${beneficiary}-${orig.msgId}`];
  }
}

module.exports = Ledger
