var messaging = require('./messaging');
var debug = require('./debug');
var Ledger = require('./ledgers');
var randomBytes = require('randombytes');
var shajs = require('sha.js')

function sha256(x) {
  return shajs('sha256').update(x).digest();
}

function verifyHex(preimageHex, hashHex) {
  const preimage = Buffer.from(preimageHex, 'hex');
  const correctHash = sha256(preimage);
  return Buffer.from(hashHex, 'hex').equals(correctHash);
}

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

Agent.prototype._createProbe = function(revPeer) {
  // const newProbe = randomBytes(8).toString('hex');
  const newProbe = this._myNick + '-' + randomBytes(8).toString('hex');
  this._ledgers[revPeer].send(JSON.stringify({
    msgType: 'PROBE',
    fwd: [],
    rev: [ newProbe ]
  }));
  console.log('storing as if it were a fwd probe from', revPeer, newProbe);
  this._ledgers[revPeer]._probesSeen.fwd.push(newProbe); // pretend it came from them, to detect loops later
  const thisBal = this._ledgers[revPeer].getBalance();
  for(let k in this._ledgers) {
    const relBal = this._ledgers[k].getBalance() - thisBal;
    if (relBal < 0) { // lower neighbor, create a rev:
      this._ledgers[k].send(JSON.stringify({
        msgType: 'PROBE',
        fwd: [ newProbe ],
        rev: []
      }));
    }
  }
}

Agent.prototype._useLoop = function(routeId, revPeer, fwdPeer) {
  // fwdPeer wants to receive a COND.
  // revPeer wants to send you a COND.
  // this is beneficial if revPeer owes you money (pos balance) and you owe fwdPeer money (neg balance)

  const balOut = this._ledgers[revPeer].getBalance(); // should be neg
  const balIn = this._ledgers[fwdPeer].getBalance();  // should be pos
  const diff = balIn - balOut;
  const amount = diff/2;
  debug.log('using loop', this._myNick, { balOut, balIn, diff, amount });
  const preimage = randomBytes(256);
  const hashHex = sha256(preimage).toString('hex');
  this._preimages[hashHex] = preimage;
  msg = this._ledgers[fwdPeer].create(amount, hashHex, routeId);
  this._ledgers[fwdPeer].send(JSON.stringify(msg));
  this._ledgers[fwdPeer].handleMessage(msg);
}

Agent.prototype._handleProbe = function(fromNick, msg) {
  this._ledgers[fromNick]._probesSeen.fwd = this._ledgers[fromNick]._probesSeen.fwd.concat(msg.fwd);
  this._ledgers[fromNick]._probesSeen.rev = this._ledgers[fromNick]._probesSeen.rev.concat(msg.rev);
  const thisBal = this._ledgers[fromNick].getBalance();
  for(let k in this._ledgers) {
    const relBal = this._ledgers[k].getBalance() - thisBal;
    if (relBal < 0 && msg.fwd.length) { // lower neighbor, forwards the fwd's
      let loopFound = false;
      msg.fwd.map(probe => {
        if (this._ledgers[k]._probesSeen.rev.indexOf(probe) !== -1) {
          console.log('loop found from fwd probe!', probe, k, this._myNick, fromNick, JSON.stringify(this._ledgers[k]._probesSeen));
          // fromNick has sent a forward probe, meaning they want to send a COND.
          // k has sent a rev probe, meaning they want to receive a COND.
          // this is beneficial if fromNick owes you money (pos balance) and you owe k money (neg balance)
          loopFound = true;
          this._useLoop(probe, k, fromNick);
        }
      });
      if (!loopFound) { // TODO: still send rest of the probes if one probe gave a loop
        debug.log('no loops found from fwd probe', {fromNick, k}, this._myNick, msg.fwd, this._ledgers[k]._probesSeen.rev);
        setTimeout(() => {
          this._ledgers[k].send(JSON.stringify({
            msgType: 'PROBE',
            fwd: msg.fwd,
            rev: []
          }));
        }, 100);
      }
    }
    if (relBal > 0 && msg.rev.length) { // higher neighbor, forwards the rev's
      let loopFound = false;
      msg.rev.map(probe => {
        if (this._ledgers[k]._probesSeen.fwd.indexOf(probe) !== -1) {
          console.log('loop found from rev probe!', probe, k, this._myNick, fromNick, JSON.stringify(this._ledgers[k]._probesSeen));
          loopFound = true;
          // commenting this out to avoid finding the same loop twice:
          // this._useLoop(probe, fromNick, k);
        }
      });
      if (!loopFound) { // TODO: still send rest of the probes if one probe gave a loop
        debug.log('no loops found from rev probe', {fromNick, k}, this._myNick, msg.rev, this._ledgers[k]._probesSeen.fwd);
        setTimeout(() => {
          this._ledgers[k].send(JSON.stringify({
            msgType: 'PROBE',
            fwd: [],
            rev: msg.rev
          }));
        }, 100);
      }
    }
  }
}

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

Agent.prototype._handleFulfill = function(fromNick, msg) {
  // TODO: check whether the preimage is valid
  if (this._ledgers[fromNick]._pendingCond[msg.msgId]) {
    const backer = this._ledgers[fromNick]._pendingCond[msg.msgId].fromNick;
    debug.log('handling fulfill, backer found:', backer);
    // FIXME: sending this ACK after the FULFILL has already committed the transaction confuses things!
    // this._ledgers[fromNick].send(JSON.stringify({
    //   msgType: 'ACK',
    //   sender: this._myNick,
    //   msgId: msg.msgId
    // }));
    debug.log('agent-level orig:', this._ledgers[fromNick]._pendingCond[msg.msgId]);
    const backMsg = {
      msgType: 'FULFILL',
      sender: backer,
      msgId: this._ledgers[fromNick]._pendingCond[msg.msgId].msg.msgId,
      preimage: msg.preimage
    };
    this._ledgers[backer].handleMessage(backMsg);
    debug.log(`Passing on FULFILL ${fromNick} -> ${this._myNick} -> ${backer}`, backMsg);
    this._ledgers[backer].send(JSON.stringify(backMsg));
  } else {
    debug.log(this._myNick + ': cannot find backer, I must have been the loop initiator.');
  }
}

Agent.prototype._handleReject = function(fromNick, msg) {
}

module.exports = Agent;
