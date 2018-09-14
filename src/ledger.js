const debug = require('./debug');
var Hubbie = require('hubbie').Hubbie;
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

function Ledger(peerNick, myNick, unit, agent, medium) {
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
  this._probesReceived = { cwise: [], fwise: [] };
  this._agent = agent;
  this.myNextId = 0;
  console.log({ medium });
  if (typeof medium === 'object' && medium.addChannel) {
    this._doSendStr = medium.addChannel(myNick, peerNick, (msgStr) => {
      console.log('handling incoming msg!', myNick, peerNick, msgStr);
      return this._handleMessage(JSON.parse(msgStr));
    });
    this._doSend = (obj) => {
      console.log('doSend calling doSendStr!', obj, myNick, peerNick); 
      return this._doSendStr(JSON.stringify(obj));
    };
  } else {
    let config;
    if (typeof medium === 'number') {
      config = { listen: medium };
    } else if (typeof medium === 'object') {
      config = { server: medium };
    } else if (typeof medium === 'string') {
      config = {
        upstreams: [ {
          url: medium,
          name: 'client-server',
          token: 'secret'
        } ]
      };
    }
    let hubbie = new Hubbie(config, (peerId) => {
      this._doSend = (msg) => {
        return hubbie.send(msg, peerId);
      };
    }, (obj, peerId) => {
      this._handleMessage(obj);
    });
    hubbie.start().then(() => {
    });
  }
}

Ledger.prototype = {
  send: function(obj) {
    this._handleMessage(obj, true);
    this._doSend(obj);
  },

  //                           >>>> ADD >>>       >>>> ADD >>>
  //                             down | up          down | up
  //                           <<<< ACK <<<       <<<< ACK <<<

  //                 cside peer -[low|high]- agent -[low|high]- fside peer

  //                           < cwise PROBE <    < cwise PROBE <
  //                           > fwise PROBE >    > fwise PROBE >

  //                            <<< COND <<<      <<< COND <<<
  //                             up | down          up | down
  //                            > FULFILL >>      > FULFILL >>

  // to be executed in cside ledger:
  _startLoop: function(routeId, fsidePeer) {
    // fsidePeer has sent us a cside probe, meaning they want to send a COND.
    // This Ledger said it's usable, so we should start a loop
    // But let's just double-check the balances, and choose a loop amount of half the diff:

    const fsideBal = this._agent._peerHandlers[fsidePeer].getBalance(); // our fside balance should be low because it will go up
    const csideBal = this.getBalance();  // our cside balance should be high because it will go down
    const diff = csideBal - fsideBal;
    const amount = diff/2;
    debug.log('using loop', this._myNick, { fsideBal, csideBal, diff, amount });
    const preimage = randomBytes(256);
    const hashHex = sha256(preimage).toString('hex');
    this._agent._preimages[hashHex] = preimage;
    if (amount <0) {
      debug.log('amount below zero!', amount);
      panic();
    }
    // the COND should be sent to this ledger's peer (cside):
    msg = this.create(amount, hashHex, routeId);
    this.send(msg);
  },
  // to be executed in cside ledger, where our balance is too high:
  _createProbe: function() {
    // const newProbe = randomBytes(8).toString('hex');
    const newProbe = this._myNick + '-' + randomBytes(8).toString('hex');
    this.send({
      msgType: 'PROBES',
      cwise: [ newProbe ],
      fwise: []
    });
    console.log('storing as if it were an fside probe from', this._peerNick, newProbe);
    this._probesReceived.fwise.push(newProbe); // pretend it came from them, to detect loops later
    const thisBal = this.getBalance();
    for(let fsideLedger in this._agent._peerHandlers) {
      // Our fside balance will go down, so find one whose balance is higher:
      if (this._agent._peerHandlers[fsideLedger].getBalance() > thisBal) {
        this._agent._peerHandlers[fsideLedger].send({
          msgType: 'PROBES',
          cwise: [],
          fwise: [ newProbe ]
        });
      }
    }
  },

  //                           >>>> ADD >>>       >>>> ADD >>>
  //                             down | up          down | up
  //                           <<<< ACK <<<       <<<< ACK <<<

  //                 cside peer -[low|high]- agent -[low|high]- fside peer

  //                           < cwise PROBE <    < cwise PROBE <
  //                           > fwise PROBE >    > fwise PROBE >

  //                            <<< COND <<<      <<< COND <<<
  //                             up | down          up | down
  //                            > FULFILL >>      > FULFILL >>


  // to be executed on all other side when a probe comes in from one peer
  considerProbe: function(ourOtherBal, msg, receivedFromPeer) {
    const relBal = this.getBalance() - ourOtherBal;
    if (this.getBalance() > ourOtherBal && msg.cwise.length) { // this balance is higher, potential cside, forward the cwise probes
      let loopFound = false;
      msg.cwise.map(probe => {
        if (this._probesReceived.fwise.indexOf(probe) !== -1) {
          console.log(`${this._myNick} found loop found from cwise probe that ${receivedFromPeer} sent, usable for ledger with ${this._peerNick}!`, probe, JSON.stringify(this._probesReceived));
          // receivedFromPeer has sent a cwise probe, meaning they want to send us a COND.
          // This Peer has previously sent us an fwise probe, meaning they want us to send them a COND.
          // this is beneficial if you owe receivedFromPeer money (low balance) and this peer owes you money (high balance)
          // So we should start a loop
          this._startLoop(probe, receivedFromPeer);
          loopFound = true;
        }
      });
      if (!loopFound) { // TODO: still send rest of the probes if one probe gave a loop
        debug.log('no loops found from cside probe', this._peerNick, this._myNick, msg.cwise, this._probesReceived.fwise);
        setTimeout(() => {
          this.send({
            msgType: 'PROBES',
            cwise: msg.cwise,
            fwise: []
          });
        }, 100);
      }
    }
    if (this.getBalance() < ourOtherBal && msg.fwise.length) { // this balance is lower, potential fside, forward the fwise probes
      let loopFound = false;
      msg.fwise.map(probe => {
        if (this._probesReceived.cwise.indexOf(probe) !== -1) {
          console.log('loop found from fwise probe!', probe, this._myNick, this._peerNick, JSON.stringify(this._probesReceived));
          loopFound = true;
          // stop passing on the fwise probe, but don't initiate the loop, leave that to the node that discovers the cwise probe
        }
      });
      if (!loopFound) { // TODO: still send rest of the probes if one probe gave a loop
        debug.log('no loops found from fwise probe', this._peerNick, this._myNick, msg.fwise, this._probesReceived.cwise);
        setTimeout(() => {
          this.send({
            msgType: 'PROBES',
            cwise: [],
            fwise: msg.fwise
          });
        }, 100);
      }
    }
  },

  _handleProbe: function(msg) {
    this._probesReceived.cwise = this._probesReceived.cwise.concat(msg.cwise);
    this._probesReceived.fwise = this._probesReceived.fwise.concat(msg.fwise);
    const thisBal = this.getBalance();
    for(let otherPeer in this._agent._peerHandlers) {
      this._agent._peerHandlers[otherPeer].considerProbe(thisBal, msg, this._peerNick);
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
  _handleMessage: function(msg, outgoing) {
    debug.log('Handling', msg);
    switch(msg.msgType) {
      case 'ADD': {
        this._pendingBalance[msg.beneficiary] += msg.amount;
        this._pendingMsg[`${msg.sender}-${msg.msgId}`] = msg;
        if (!outgoing) {
          const reply = {
            msgType: 'ACK',
            msgId: msg.msgId,
            sender: this._peerNick
          };
          this.send(reply);
          this._createProbe(); // peer now owes me money, so I'll send them a fside probe
        }
        break;
      }
      case 'COND': {
        this._pendingBalance[msg.beneficiary] += msg.amount;
        this._pendingMsg[`${msg.sender}-${msg.msgId}`] = msg;
        debug.log('COND - COND - COND', this._myNick, this._pendingMsg);
        if (!outgoing) {
          setTimeout(() => this._handleCond(msg), 100);
        }
        break;
      }
      case 'ACK': {
        const orig = this._pendingMsg[`${msg.sender}-${msg.msgId}`];
        if (!orig) {
          debug.log('panic! ACK for non-existing orig', this._pendingMsg, msg);
          panic();
        }
        this._pendingBalance[orig.beneficiary] -= orig.amount;
        this._currentBalance[orig.beneficiary] += orig.amount;
        this._committed[`${msg.sender}-${msg.msgId}`] = this._pendingMsg[`${msg.sender}-${msg.msgId}`];
        delete this._pendingMsg[`${msg.sender}-${msg.msgId}`];
        debug.log('Committed', msg);
        break;
      }
      case 'FULFILL': {
        const orig = this._pendingMsg[`${msg.sender}-${msg.msgId}`];
        debug.log('FULFILL - FULFILL - FULFILL', this._myNick, this._pendingMsg);
        this._pendingBalance[orig.beneficiary] -= orig.amount;
        this._currentBalance[orig.beneficiary] += orig.amount;
        this._committed[`${msg.sender}-${msg.msgId}`] = this._pendingMsg[`${msg.sender}-${msg.msgId}`];
        delete this._pendingMsg[`${msg.sender}-${msg.msgId}`];
        debug.log('Committed', msg);
        if (!outgoing) {
          this._handleFulfill(msg);
        }
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
      case 'PROBES': {
        if (!outgoing) {
          this._handleProbe(msg);
        }
        break;
      }
    }
  },
  getBalance: function() {
    return this._currentBalance[this._myNick] - this._currentBalance[this._peerNick];
  },

  _handleCond: function(msg) {
    debug.log(`Agent ${this._myNick} handles COND that comes in from ${this._peerNick}`, msg);
    if (this._agent._preimages[msg.condition]) {
      debug.log('replying with fulfill!', msg.condition, this._agent._preimages[msg.condition].toString('hex'))
      const reply = {
        msgType: 'FULFILL',
        msgId: msg.msgId,
        sender: this._peerNick,
        preimage: this._agent._preimages[msg.condition].toString('hex')
      };
      this.send(reply);
    } else {
      debug.log('hashlock not mine', this._myNick, msg.condition, Object.keys(this._agent._preimages));
      let suggestLowerAmount = false;
      const thisBal = this.getBalance();
      for(let toNick in this._agent._peerHandlers) {
        debug.log('considering a forward to', toNick, thisBal, this._agent._peerHandlers[toNick].getBalance());
        // when fowarding a COND, your incoming balance will increase and your outgoing balance will decrease
        // so it's useful if your outgoing balance is currently higher:
        const relBal = this._agent._peerHandlers[toNick].getBalance() - thisBal;
        // example: outBal is 4, inBal is 1; relBal is 3, amount is 2;
        // afterwards, outBal will be 2 and inBal will be 3, so relBal will be -1 (which is closer to zero than current 3)
        if (relBal > msg.amount) { // neighbor is higher, forward it
          debug.log('forwarding!', relBal, msg.amount, this._peerNick, this._myNick, toNick);
          forwardMsg = this._agent._peerHandlers[toNick].create(msg.amount, msg.condition, msg.routeId);
          this._agent._peerHandlers[toNick]._ledger._pendingCond[msg.msgId] = {
            fromNick: this._peerNick,
            toNick,
            msg
          };
          debug.log(`${this._myNick} is forwarding COND from ${this._peerNick} to ${toNick}`, msg);
          debug.log(`Probes seen at incoming peer`, this._probesReceived);
          debug.log(`Probes seen at outgoing peer`, this._agent._peerHandlers[toNick]._probesReceived);

          this._agent._peerHandlers[toNick].send(forwardMsg);
          return;
        } else if (relBal > 0) {
          suggestLowerAmount = true;
        } else {
          debug.log(`I don't want to forward this COND from ${this._peerNick} to ${toNick} because my balance with ${toNick} is ${this._agent._peerHandlers[toNick].getBalance()} and my balance with ${this._peerNick} is ${thisBal}`);
        }
      }
      this.send({
        msgType: 'REJECT',
        sender: msg.sender,
        msgId: msg.msgId,
        reason: (suggestLowerAmount ? 'try a lower amount' : 'not my hashlock and no onward route found')
      });
    }
  },

  _handleFulfill: function(msg) {
    // TODO: check whether the preimage is valid
    if (this._pendingCond[msg.msgId]) {
      const backer = this._pendingCond[msg.msgId].fromNick;
      debug.log('handling fulfill, backer found:', backer);
      // FIXME: sending this ACK after the FULFILL has already committed the transaction confuses things!
      // this.send({
      //   msgType: 'ACK',
      //   sender: this._myNick,
      //   msgId: msg.msgId
      // });
      debug.log('cond-level orig:', this._pendingCond[msg.msgId]);
      const backMsg = {
        msgType: 'FULFILL',
        sender: backer,
        msgId: this._pendingCond[msg.msgId].msg.msgId,
        preimage: msg.preimage
      };
      debug.log(`Passing on FULFILL ${this._peerNick} -> ${this._myNick} -> ${backer}`, backMsg);
      this._agent._peerHandlers[backer].send(backMsg);
    } else {
      debug.log(this._myNick + ': cannot find backer, I must have been the loop initiator.');
    }
  },

  _handleReject: function(msg) {
  }
};

module.exports = Ledger;
