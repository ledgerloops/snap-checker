const debug = require('./debug');
var Ledger = require('./ledger');
var randomBytes = require('randombytes');
var shajs = require('sha.js')

function sha256(x) {
  return shajs('sha256').update(x).digest();
}

function PeerHandler(peerNick, myNick, unit, agent, medium) {
  this._peerNick = peerNick;
  this._myNick = myNick;
  this._agent = agent;
  this._ledger = new Ledger(peerNick, myNick, unit, this, medium);
  this._probesReceived = { cwise: {}, fwise: {} };
  this._pendingCond = {};
}

PeerHandler.prototype = {
  send: function(msg) {
    console.log(`peerhandler ${this._myNick} sends to ${this._peerNick}!`, msg);
    return this._ledger.send(msg);
  },
  getBalance: function() {
    return this._ledger.getBalance();
  },
  considerProbe: function(thisBal, msg, peerNick) {
    return this._ledger.considerProbe(thisBal, msg, peerNick);
  },
  create: function(amount, hashHex, routeId) {
    return this._ledger.create(amount, hashHex, routeId);
  },
  _handleAdd: function(msg) {
    const reply = {
      msgType: 'ACK',
      msgId: msg.msgId
    };
    this.send(reply);
    this._createProbe(); // peer now owes me money, so I'll send them a cwise probe, and maybe send some other peers an fwise one for it
  },
  _handleCond: function(msg) {
    debug.log(`Agent ${this._myNick} handles COND that comes in from ${this._peerNick}`, msg);
    if (this._agent._preimages[msg.condition]) {
      debug.log('replying with fulfill!', msg.condition, this._agent._preimages[msg.condition].toString('hex'))
      const reply = {
        msgType: 'FULFILL',
        msgId: msg.msgId,
        preimage: this._agent._preimages[msg.condition].toString('hex')
      };
      this.send(reply);
    } else {
      debug.log('hashlock not mine', this._myNick, msg.condition, Object.keys(this._agent._preimages));
      let suggestLowerAmount = false;
      const thisBal = this.getBalance();
      for(let toNick in this._agent._peerHandlers) {
        if (this._agent._peerHandlers[toNick]._probesReceived.fwise[msg.routeId]) {
          debug.log('not considering a forward to', toNick, msg.routeId,this._agent._peerHandlers[toNick]._probesReceived)
          continue;
        }
        debug.log('considering a forward to', toNick, thisBal, this._agent._peerHandlers[toNick].getBalance());
        // when fowarding a COND, your incoming balance will increase and your outgoing balance will decrease
        // so it's useful if your outgoing balance is currently higher:
        const relBal = this._agent._peerHandlers[toNick].getBalance() - thisBal;
        // example: outBal is 4, inBal is 1; relBal is 3, amount is 2;
        // afterwards, outBal will be 2 and inBal will be 3, so relBal will be -1 (which is closer to zero than current 3)
        if (relBal > msg.amount) { // neighbor is higher, forward it
          debug.log('forwarding!', relBal, msg.amount, this._peerNick, this._myNick, toNick);
          forwardMsg = this._agent._peerHandlers[toNick].create(msg.amount, msg.condition, msg.routeId);
          this._agent._peerHandlers[toNick]._pendingCond[msg.msgId] = {
            fromNick: this._peerNick,
            toNick,
            msg
          };
          debug.log(`${this._myNick} is forwarding COND from ${this._peerNick} to ${toNick}`, msg);
          debug.log(`Probes seen at incoming peer`, this._ledger._probesReceived);
          debug.log(`Probes seen at outgoing peer`, this._agent._peerHandlers[toNick]._ledger._probesReceived);
          //FIXME: https://github.com/ledgerloops/ledgerloops/issues/32
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
      //   msgId: msg.msgId
      // });
      debug.log('cond-level orig:', this._pendingCond[msg.msgId]);
      const backMsg = {
        msgType: 'FULFILL',
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
  },

    ////////////
   // PROBES //
  ////////////

  //                           >>>> ADD >>>       >>>> ADD >>>
  //                             down | up          down | up
  //                           <<<< ACK <<<       <<<< ACK <<<

  //                 cside peer -[low|high]- agent -[low|high]- fside peer

  //                           < cwise PROBE <    < cwise PROBE <
  //                           > fwise PROBE >    > fwise PROBE >

  //                            <<< COND <<<      <<< COND <<<
  //                             up | down          up | down
  //                            > FULFILL >>      > FULFILL >>

  _handleProbe: function(msg) {
    msg.cwise = msg.cwise.filter(probe => {
      if (this._probesReceived.cwise[probe]) {
        console.log('cwise loop found!', this._myNick, probe);
        return false;
      } else {
        this._probesReceived.cwise[probe] = true;
        return true;
      }
    });
    msg.fwise = msg.fwise.filter(probe => {
      if (this._probesReceived.fwise[probe]) {
        console.log('fwise loop found!', this._myNick, probe);
        return false;
      } else {
        this._probesReceived.fwise[probe] = true;
        return true;
      }
    });
    const thisBal = this.getBalance();
    for(let otherPeer in this._agent._peerHandlers) {
      this._agent._peerHandlers[otherPeer].considerProbe(thisBal, msg, this._peerNick);
    }
  },

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

  // to be executed on all other side when a probe comes in from one peer
  considerProbe: function(ourOtherBal, msg, receivedFromPeer) {
    const relBal = this.getBalance() - ourOtherBal;
    console.log('considering probe', { ourOtherBal, receivedFromPeer, msg, relBal });
    if (this.getBalance() > ourOtherBal && msg.fwise.length) { // this balance is higher, potential cside, forward the fwise probes
      console.log(`${this._myNick} is forwarding fwise probes from ${receivedFromPeer} to ${this._peerNick}`);
      setTimeout(() => {
        this.send({
          msgType: 'PROBES',
          cwise: [],
          fwise: msg.fwise
        });
      }, 100);
    }
    if (this.getBalance() < ourOtherBal && msg.cwise.length) { // this balance is lower, potential fside, forward the cwise probes
      console.log(`${this._myNick} is forwarding cwise probes from ${receivedFromPeer} to ${this._peerNick}`);
      setTimeout(() => {
        this.send({
          msgType: 'PROBES',
          cwise: msg.cwise,
          fwise: []
        });
      }, 100);
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


  // to be executed in cside ledger, where our balance is too high:
  _createProbe: function() {
    // const newProbe = randomBytes(8).toString('hex');
    const newProbe = this._myNick + '-' + randomBytes(8).toString('hex');
    this.send({
      msgType: 'PROBES',
      cwise: [ newProbe ],
      fwise: []
    });
    const thisBal = this.getBalance();
    for(let fsideLedger in this._agent._peerHandlers) {
      console.log(`considering sending fwise to ${fsideLedger}: \
${this._agent._peerHandlers[fsideLedger].getBalance()} ?< ${thisBal}`);
      // Our fside balance will go down, so find one whose balance is higher:
      if (this._agent._peerHandlers[fsideLedger].getBalance() < thisBal) {
        this._agent._peerHandlers[fsideLedger].send({
          msgType: 'PROBES',
          cwise: [],
          fwise: [ newProbe ]
        });
      }
    }
  }
};

module.exports = PeerHandler;
