var messaging = require('./messaging');
var debug = require('./debug');
var Ledger = require('./ledgers');

function Agent(myNick) {
  this._myNick = myNick;
  this._ledgers = {};
  this._preimages = {};
}

Agent.prototype.ensurePeer = function(peerNick) {
  if (typeof this._ledgers[peerNick] === 'undefined') {
    this._ledgers[peerNick] = new Ledger(peerNick, this._myNick, 'UCR', this);
  }
};

Agent.prototype._handleCond = function(fromNick, msg) {
  if (this._preimages[msg.condition]) {
    debug.log('replying with fulfill!', msg.condition, this._preimages[msg.condition].toString('hex'))
    const reply = {
      msgType: 'FULFILL',
      msgId: msg.msgId,
      sender: fromNick,
      preimage: this._preimages[msg.condition].toString('hex')
    };
    this._ledgers[fromNick].send(JSON.stringify(reply));
    this._ledgers[fromNick].handleMessage(reply);
  } else {
    debug.log('hashlock not mine', this._myNick, msg.condition, Object.keys(this._preimages));
    let suggestLowerAmount = false;
    const thisBal = this._ledgers[fromNick].getBalance();
    for(let toNick in this._ledgers) {
      debug.log('considering a forward to', toNick, thisBal, this._ledgers[toNick].getBalance());
      // when forwarding a COND, your incoming balance will increase and your outgoing balance will decrease
      // so it's useful if your outgoing balance is currently higher:
      const relBal = this._ledgers[toNick].getBalance() - thisBal;
      // example: outBal is 4, inBal is 1; relBal is 3, amount is 2;
      // afterwards, outBal will be 2 and inBal will be 3, so relBal will be -1 (which is closer to zero than current 3)
      if (relBal > msg.amount) { // neighbor is higher, forward it
        debug.log('forwarding!', relBal, msg.amount, fromNick, this._myNick, toNick);
        fwdMsg = this._ledgers[toNick].create(msg.amount, msg.condition, msg.routeId);
        this._ledgers[toNick]._pendingCond[msg.msgId] = {
          fromNick,
          toNick,
          msg
        };
        this._ledgers[toNick].send(JSON.stringify(fwdMsg));
        this._ledgers[toNick].handleMessage(fwdMsg);
        return;
      } else if (relBal > 0) {
        suggestLowerAmount = true;
      }
    }
    this._ledgers[fromNick].send(JSON.stringify({
      msgType: 'REJECT',
      sender: msg.sender,
      msgId: msg.msgId,
      reason: (suggestLowerAmount ? 'try a lower amount' : 'not my hashlock and no onward route found')
    }));
  }
}

module.exports = Agent;
