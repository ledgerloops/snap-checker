const debug = require('./debug');
var messaging = require('./messaging');
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
  this.send = messaging.addChannel(peerNick, myNick, (msgStr) => {
    return this._handleMessage(JSON.parse(msgStr));
  });
}

Ledger.prototype = {
  _useLoop: function(routeId, otherPeer) {
    // This Peer at this ledger wants to receive a COND.
    // The other peer wants to send you a COND.
    // this is beneficial if revPeer owes you money (pos balance) and you owe this ledger's Peer money (neg balance)
  
    const balOut = this._agent._ledgers[otherPeer].getBalance(); // should be neg
    const balIn = this.getBalance();  // should be pos
    const diff = balIn - balOut;
    const amount = diff/2;
    debug.log('using loop', this._myNick, { balOut, balIn, diff, amount });
    const preimage = randomBytes(256);
    const hashHex = sha256(preimage).toString('hex');
    this._agent._preimages[hashHex] = preimage;
    msg = this.create(amount, hashHex, routeId);
    this.send(JSON.stringify(msg));
    this.handleMessage(msg);
  },

  _createProbe: function() {
    // const newProbe = randomBytes(8).toString('hex');
    const newProbe = this._myNick + '-' + randomBytes(8).toString('hex');
    this.send(JSON.stringify({
      msgType: 'PROBE',
      fwd: [],
      rev: [ newProbe ]
    }));
    console.log('storing as if it were a fwd probe from', this._peerNick, newProbe);
    this._probesSeen.fwd.push(newProbe); // pretend it came from them, to detect loops later
    const thisBal = this.getBalance();
    for(let k in this._agent._ledgers) {
      const relBal = this._agent._ledgers[k].getBalance() - thisBal;
      if (relBal < 0) { // lower neighbor, create a rev:
        this._agent._ledgers[k].send(JSON.stringify({
          msgType: 'PROBE',
          fwd: [ newProbe ],
          rev: []
        }));
      }
    }
  },
  considerProbe: function(peerBalance, msg) {
    const relBal = this.getBalance() - peerBalance;
    let usableProbes = [];
    if (relBal < 0 && msg.fwd.length) { // lower neighbor, forwards the fwd's
      let loopFound = false;
      msg.fwd.map(probe => {
        if (this._probesSeen.rev.indexOf(probe) !== -1) {
          console.log('loop found from fwd probe!', probe, this._myNick, JSON.stringify(this._probesSeen));
          // Peer has sent a forward probe, meaning they want to send a COND.
          // k has sent a rev probe, meaning they want to receive a COND.
          // this is beneficial if Peer owes you money (pos balance) and you owe k money (neg balance)
          loopFound = true;
          usableProbes.push(probe);
        }
      });
      if (!loopFound) { // TODO: still send rest of the probes if one probe gave a loop
        debug.log('no loops found from fwd probe', this._peerNick, this._myNick, msg.fwd, this._probesSeen.rev);
        setTimeout(() => {
          this.send(JSON.stringify({
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
        if (this._probesSeen.fwd.indexOf(probe) !== -1) {
          console.log('loop found from rev probe!', probe, this._myNick, this._peerNick, JSON.stringify(this._probesSeen));
          loopFound = true;
          // stop passing on the rev probe, but don't initiate the loop, leave that to the node that discovers the fwd probe 
        }
      });
      if (!loopFound) { // TODO: still send rest of the probes if one probe gave a loop
        debug.log('no loops found from rev probe', this._peerNick, this._myNick, msg.rev, this._probesSeen.fwd);
        setTimeout(() => {
          this.send(JSON.stringify({
            msgType: 'PROBE',
            fwd: [],
            rev: msg.rev
          }));
        }, 100);
      }
    }
    return usableProbes;
  },

  _handleProbe: function(msg) {
    this._probesSeen.fwd = this._probesSeen.fwd.concat(msg.fwd);
    this._probesSeen.rev = this._probesSeen.rev.concat(msg.rev);
    const thisBal = this.getBalance();
    for(let k in this._agent._ledgers) {
      const usableProbes = this._agent._ledgers[k].considerProbe(thisBal, msg);
      usableProbes.map(probe => {
        this._useLoop(probe, k);
      });
    }
  },

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
      this._createProbe(); // peer now owes me money, so I'll send them a rev probe
    } else if (msg.msgType === 'COND') {
      if (msg.msgId > 20) { panic(); }
      setTimeout(() => this._handleCond(msg), 100);
    } else if (msg.msgType === 'FULFILL') {
      this._handleFulfill(msg);
    } else if (msg.msgType === 'PROBE') {
      debug.log('handling probe', this._myNick, this._peerNick, msg);
      this._handleProbe(msg);
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

  _handleCond: function(msg) {
    if (this._agent._preimages[msg.condition]) {
      debug.log('replying with fulfill!', msg.condition, this._agent._preimages[msg.condition].toString('hex'))
      const reply = {
        msgType: 'FULFILL',
        msgId: msg.msgId,
        sender: this._peerNick,
        preimage: this._agent._preimages[msg.condition].toString('hex')
      };
      this.send(JSON.stringify(reply));
      this.handleMessage(reply);
    } else {
      debug.log('hashlock not mine', this._myNick, msg.condition, Object.keys(this._agent._preimages));
      let suggestLowerAmount = false;
      const thisBal = this.getBalance();
      for(let toNick in this._agent._ledgers) {
        debug.log('considering a forward to', toNick, thisBal, this._agent._ledgers[toNick].getBalance());
        // when forwarding a COND, your incoming balance will increase and your outgoing balance will decrease
        // so it's useful if your outgoing balance is currently higher:
        const relBal = this._agent._ledgers[toNick].getBalance() - thisBal;
        // example: outBal is 4, inBal is 1; relBal is 3, amount is 2;
        // afterwards, outBal will be 2 and inBal will be 3, so relBal will be -1 (which is closer to zero than current 3)
        if (relBal > msg.amount) { // neighbor is higher, forward it
          debug.log('forwarding!', relBal, msg.amount, this._peerNick, this._myNick, toNick);
          fwdMsg = this._agent._ledgers[toNick].create(msg.amount, msg.condition, msg.routeId);
          this._agent._ledgers[toNick]._pendingCond[msg.msgId] = {
            fromNick: this._peerNick,
            toNick,
            msg
          };
          this._agent._ledgers[toNick].send(JSON.stringify(fwdMsg));
          this._agent._ledgers[toNick].handleMessage(fwdMsg);
          return;
        } else if (relBal > 0) {
          suggestLowerAmount = true;
        }
      }
      this.send(JSON.stringify({
        msgType: 'REJECT',
        sender: msg.sender,
        msgId: msg.msgId,
        reason: (suggestLowerAmount ? 'try a lower amount' : 'not my hashlock and no onward route found')
      }));
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
