var verifyHash = require('./hashlocks').verifyHash;

function Ledger (unit, myDebugName) {
  this._myDebugName = myDebugName;
  this._unit = unit;
  this._balance = {};
  this._msgLog = {};
  this.myNextId = {};
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
    if (typeof amount !== 'number') {
      panic();
    } 
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
    return this._msgLog;
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
  logMsg: function (peerName, msgObj, outgoing) {
    const sender = (outgoing ? 'bank' : peerName);
    const receiver = (outgoing ? peerName : 'bank');
    let proposer;
    let beneficiary;
    let response;
    switch (msgObj.msgType) {
      case 'ADD':
      case 'COND':
        proposer = sender;
        beneficiary = receiver;
        response = false;
        break;
      case 'ACK':
      case 'FULFILL':
      case 'REJECT':
        proposer = receiver;
        beneficiary = sender;
        response = true;
        break;
      default:
        console.log(msgObj);
        throw new Error('unknown message type');
    };
    if (!this._msgLog[`${proposer}-${beneficiary}`]) {
      this._msgLog[`${proposer}-${beneficiary}`] = {};
    }
    if (!this._msgLog[`${proposer}-${beneficiary}`][msgObj.msgId]) {
      if (response) {
        console.log(this._msgLog, proposer, beneficiary, msgObj);
        throw new Error('unexpected response!');
      }
      this._msgLog[`${proposer}-${beneficiary}`][msgObj.msgId] = {
        messages: [],
        'status': 'new',
      };
    }
    let entry = this._msgLog[`${proposer}-${beneficiary}`][msgObj.msgId];
    entry.messages.push(msgObj);
    if (response) { // ACK, FULFILL, REJECT
      if (entry['status'] === 'pending') {
        if (msgObj.msgType === 'REJECT') {
          entry['status'] = 'rejected';
          this.addBalance(proposer, 'payable', -entry.request.amount);
          this.addBalance(beneficiary, 'receivable', -entry.request.amount);
          entry.response = msgObj;
          entry.reject(new Error(msgObj.reason));
        } else {
          if (entry.request.condition && !verifyHash(msgObj.preimage, entry.request.condition)) {
            console.log('hashlock error! not accepting transaction (yet)');
          } else {
            this.addBalance(proposer, 'payable', -entry.request.amount);
            this.addBalance(proposer, 'current', -entry.request.amount);

            this.addBalance(beneficiary, 'receivable', -entry.request.amount);
            this.addBalance(beneficiary, 'current', entry.request.amount);
            entry['status'] = 'accepted';
            entry.response = msgObj;
            entry.resolve(msgObj.preimage);
          }
        }
      }
    } else { // ADD, COND
      if (entry['status'] === 'new') {
        entry['status'] = 'pending';
        entry.request = msgObj;
        const promise = new Promise((resolve, reject) => {
          entry.resolve = resolve;
          entry.reject = reject;
        });
        this.addBalance(proposer, 'payable', entry.request.amount);
        this.addBalance(beneficiary, 'receivable', entry.request.amount);
        return promise;
      }
    }
    return Promise.resolve();
  },
  getResponse: function (peerName, msgObj, outgoing) {
    const proposer = (outgoing ? 'bank' : peerName);
    const beneficiary = (outgoing ? peerName : 'bank');
    if (this._msgLog[`${proposer}-${beneficiary}`] && this._msgLog[`${proposer}-${beneficiary}`][msgObj.msgId]) {
      return this._msgLog[`${proposer}-${beneficiary}`][msgObj.msgId].response;
    }
  }
}

module.exports = Ledger
