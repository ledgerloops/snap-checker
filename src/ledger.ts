// import { verifyHash } from 'hashlocks';
function verifyHash(preimage: string, condition: string) {
  return true;
}
// class Promise {
//   constructor(func: (resolve: any, reject: any) => void) {

//   }
// }
// const Promise_resolve = () => {
//   return new Promise(() => {})
// }

export function Ledger(unit: any, myDebugName, db) {
  this._myDebugName = myDebugName;
  this._unit = unit;
  this._db = db;
  this._balance = {};
  this._msgLog = {};
  this.myNextId = {};
}

Ledger.prototype = {
  create: function(peerName, amount, condition, routeId) {
    if (!this.myNextId[peerName]) {
      this.myNextId[peerName] = 0;
    }
    return {
      msgType: "PROPOSE",
      msgId: this.myNextId[peerName]++,
      amount,
      unit: this._unit,
      condition,
      routeId
    };
  },
  addBalance: function(party, account, amount) {
    // console.log('addBalance', { party, account, amount });
    if (typeof amount !== "number") {
      window.alert("panic");
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
  getBalances: function() {
    return this._balance;
  },
  getTransactions: function() {
    return this._msgLog;
  },
  getLowerPeers: function(limit) {
    const list = [];
    for (const peerName in this._balance) {
      // imagine all this peer's receivables succeed, and all his payables fail:
      const highestBalanceEstimate =
        this._balance[peerName].current + this._balance[peerName].receivable;
      if (highestBalanceEstimate < limit) {
        list.push([peerName, highestBalanceEstimate]);
      }
    }
    return list.sort((a, b) => b[1] - a[1]); // lowest first
  },
  getHigherPeers: function(limit) {
    const list = [];
    for (const peerName in this._balance) {
      // imagine all this peer's receivables fail, and all his payables succeed:
      const lowestBalanceEstimate =
        this._balance[peerName].current - this._balance[peerName].payable;
      if (lowestBalanceEstimate > limit) {
        list.push([peerName, lowestBalanceEstimate]);
      }
    }
    return list.sort((a, b) => a[1] - b[1]); // highest first
  },
  insert: function(proposer, beneficiary, msgObj) {
    return this._db(
      "INSERT INTO ledger (proposer, beneficiary, msgId, request, status) VALUES ($1, $2, $3, $4, $5)",
      [proposer, beneficiary, msgObj.msgId, JSON.stringify(msgObj), "pending"]
    );
  },
  update: function(proposer, beneficiary, msgId, status, response) {
    return this._db(
      "UPDATE ledger SET status = $1, response = $2 WHERE proposer = $3 AND beneficiary = $4 AND msgId = $5",
      [status, JSON.stringify(response), proposer, beneficiary, msgId]
    );
  },
  logMsg: function(peerName, msgObj, outgoing): Promise<any> {
    // console.log('logMsg', peerName, msgObj, outgoing);
    const sender = outgoing ? "bank" : peerName;
    const receiver = outgoing ? peerName : "bank";
    let proposer;
    let beneficiary;
    let response;
    switch (msgObj.msgType) {
      case "PROPOSE":
        proposer = sender;
        beneficiary = receiver;
        response = false;
        break;
      case "ACCEPT":
      case "REJECT":
        proposer = receiver;
        beneficiary = sender;
        response = true;
        break;
      default:
        // console.log(msgObj);
        throw new Error("unknown message type");
    }
    if (!this._msgLog[`${proposer}-${beneficiary}`]) {
      this._msgLog[`${proposer}-${beneficiary}`] = {};
    }
    if (!this._msgLog[`${proposer}-${beneficiary}`][msgObj.msgId]) {
      if (response) {
        // console.log(this._msgLog, proposer, beneficiary, msgObj);
        throw new Error("unexpected response!");
      }
      this._msgLog[`${proposer}-${beneficiary}`][msgObj.msgId] = {
        messages: [],
        status: "new"
      };
    }
    const entry = this._msgLog[`${proposer}-${beneficiary}`][msgObj.msgId];
    entry.messages.push(msgObj);
    if (response) {
      // ACCEPT, REJECT
      if (entry["status"] === "pending") {
        if (msgObj.msgType === "REJECT") {
          entry["status"] = "rejected";
          this.addBalance(proposer, "payable", -entry.request.amount);
          this.addBalance(beneficiary, "receivable", -entry.request.amount);
          entry.response = msgObj;
          this.update(proposer, beneficiary, msgObj.msgId, "rejected", msgObj);
          entry.reject(new Error(msgObj.reason));
        } else {
          // console.log('checking hashlock', msgObj, entry.request);
          if (
            entry.request.condition &&
            !verifyHash(msgObj.preimage, entry.request.condition)
          ) {
            // console.log('hashlock error! not accepting transaction (yet)');
          } else {
            this.addBalance(proposer, "payable", -entry.request.amount);
            this.addBalance(proposer, "current", -entry.request.amount);

            this.addBalance(beneficiary, "receivable", -entry.request.amount);
            this.addBalance(beneficiary, "current", entry.request.amount);
            entry["status"] = "accepted";
            entry.response = msgObj;
            this.update(
              proposer,
              beneficiary,
              msgObj.msgId,
              "accepted",
              msgObj
            );
            entry.resolve(msgObj.preimage);
          }
        }
      }
    } else {
      // PROPOSE
      if (entry["status"] === "new") {
        entry["status"] = "pending";
        entry.request = msgObj;
        this.insert(proposer, beneficiary, msgObj);
        const promise = new Promise((resolve, reject) => {
          entry.resolve = resolve;
          entry.reject = reject;
        });
        this.addBalance(proposer, "payable", entry.request.amount);
        this.addBalance(beneficiary, "receivable", entry.request.amount);
        return promise;
      }
    }
    return Promise.resolve();
  },
  getResponse: function(peerName, msgObj, outgoing) {
    const proposer = outgoing ? "bank" : peerName;
    const beneficiary = outgoing ? peerName : "bank";
    if (
      this._msgLog[`${proposer}-${beneficiary}`] &&
      this._msgLog[`${proposer}-${beneficiary}`][msgObj.msgId]
    ) {
      return this._msgLog[`${proposer}-${beneficiary}`][msgObj.msgId].response;
    }
  }
};
