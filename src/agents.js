var messaging = require('./messaging');
var debug = require('./debug');
var Ledger = require('./ledgers');
var randomBytes = require('randombytes');

function Agent(myNick) {
  this._myNick = myNick;
  this._ledgers = {};
  this._probesSeen = {};
  this._sentAdds = {};
  messaging.addChannel(myNick, (fromNick, msgStr) => {
    return this._handleMessage(fromNick, JSON.parse(msgStr));
  });
}

Agent.prototype._ensurePeer = function(peerNick) {
  if (typeof this._ledgers[peerNick] === 'undefined') {
    this._ledgers[peerNick] = new Ledger(peerNick, this._myNick);
  }
  if (typeof this._probesSeen[peerNick] === 'undefined') {
    this._probesSeen[peerNick] = { fwd: [], rev: [] };
  }
};

Agent.prototype._createProbe = function(revPeer) {
  const newProbe = randomBytes(8).toString('hex');
  messaging.send(this._myNick, revPeer, JSON.stringify({
    msgType: 'PROBE',
    fwd: [],
    rev: [ newProbe ]
  }));
  this._probesSeen[revPeer].fwd.push(newProbe); // pretend it came from them, to detect loops later
  const thisBal = this._ledgers[revPeer].getBalance();
  for(let k in this._probesSeen) {
    const relBal = this._ledgers[k].getBalance() - thisBal;
    if (relBal < 0) { // lower neighbor, create a rev:
      messaging.send(this._myNick, k, JSON.stringify({
        msgType: 'PROBE',
        fwd: [ newProbe ],
        rev: []
      }));
    }
  }
}

Agent.prototype._useLoop = function(routeId, fwdPeer, revPeer) {
  // fwdPeer wants to receive a COND.
  // revPeer wants to send you a COND.
  // this is beneficial if revPeer owes you money (pos balance) and you owe fwdPeer money (neg balance)

  const balOut = this._ledgers[fwdPeer].getBalance(); // should be neg
  const balIn = this._ledgers[revPeer].getBalance();  // should be pos
  const diff = balIn - balOut;
  const amount = diff/2;
  debug.log('using loop', this._myNick, { balOut, balIn, diff, amount });
}

Agent.prototype._handleProbe = function(fromNick, msg) {
  this._probesSeen[fromNick].fwd = this._probesSeen[fromNick].fwd.concat(msg.fwd);
  this._probesSeen[fromNick].rev = this._probesSeen[fromNick].rev.concat(msg.rev);
  const thisBal = this._ledgers[fromNick].getBalance();
  for(let k in this._probesSeen) {
    const relBal = this._ledgers[k].getBalance() - thisBal;
    if (relBal < 0 && msg.fwd.length) { // lower neighbor, forwards the fwd's
      msg.fwd.map(probe => {
        if (this._probesSeen[k].rev.indexOf(probe) !== 1) {
          console.log('loop found!', probe, k, this._myNick, fromNick);
          // fromNick has sent a forward probe, meaning they want to send a COND.
          // k has sent a rev probe, meaning they want to receive a COND.
          // this is beneficial if fromNick owes you money (pos balance) and you owe k money (neg balance)
          loopFound = true;
          this._useLoop(probe, k, fromNick);
        }
      });
      if (!loopFound) {
        messaging.send(this._myNick, k, JSON.stringify({
          msgType: 'PROBE',
          fwd: msg.fwd,
          rev: []
        }));
      }
    }
    if (relBal > 0 && msg.rev.length) { // higher neighbor, forwards the rev's
      msg.rev.map(probe => {
        if (this._probesSeen[k].fwd.indexOf(probe) !== 1) {
          console.log('loop found!', probe, k, this._myNick, fromNick);
          loopFound = true;
          this._useLoop(probe, fromNick, k);
        }
      });
      if (!loopFound) {
        messaging.send(this._myNick, k, JSON.stringify({
          msgType: 'PROBE',
          fwd: [],
          rev: msg.rev
        }));
      }
    }
  }
}

Agent.prototype._handleMessage = function(fromNick, msg) {
  this._ensurePeer(fromNick);
  debug.log('seeing', fromNick, msg);
  this._ledgers[fromNick].handleMessage(msg);
  if (msg.msgType === 'ADD') {
    const reply = {
      msgType: 'ACK',
      msgId: msg.msgId,
      sender: fromNick
    };
    this._ledgers[fromNick].handleMessage(reply);
    messaging.send(this._myNick, fromNick, JSON.stringify(reply));
    this._createProbe(fromNick); // fromNick now owes me money, so I'll send them a rev probe
  } else if (msg.msgType === 'PROBE') {
    this._handleProbe(fromNick, msg);
  }
};

Agent.prototype.sendAdd = function(creditorNick, amount, currency, waitForConfirmation) {
  this._ensurePeer(creditorNick);
  var msg = this._ledgers[creditorNick].create(amount);
  this._ledgers[creditorNick].handleMessage(msg);
  var promise = messaging.send(this._myNick, creditorNick, JSON.stringify(msg));
  if (waitForConfirmation) {
    return new Promise((resolve, reject) => {
     this._sentAdds[msg.msgId] = { resolve, reject };
    });
  } else {
    this._sentAdds[msg.msgId] = { resolve: function() {}, reject: function(err) { throw err; } };
    return promise;
  }
};

module.exports = Agent;
