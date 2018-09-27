const debug = require('./debug')
var Ledger = require('./ledger')
var randomBytes = require('randombytes')
var shajs = require('sha.js')

function sha256 (x) {
  return shajs('sha256').update(x).digest()
}

function PeerHandler (peerName, myName, unit, agent) {
  this._peerName = peerName
  this._myName = myName
  this._agent = agent
  this._ledger = new Ledger(peerName, myName, unit, this)
  this._probesReceived = { cwise: {}, fwise: {} }
  this._pendingCond = {}
  this._forwardingTimers = {}
  this._forwardedPending = {}
  this._loopsStarted = {}
}

PeerHandler.prototype = {
  send: function (msgObj) {
    console.log(`peerhandler ${this._myName} sends to ${this._peerName}!`, msgObj)
    console.log('calling handleMessage, outgoing')
    this._ledger.handleMessage(msgObj, true)
    return this._agent.hubbie.send(this._peerName, JSON.stringify(msgObj))
  },
  getBalance: function () {
    return this._ledger.getBalance()
  },
  create: function (amount, hashHex, routeId) {
    return this._ledger.create(amount, hashHex, routeId)
  },
  _handleAdd: function (msg) {
    const reply = {
      msgType: 'ACK',
      msgId: msg.msgId
    }
    this.send(reply)
    this._createProbe() // peer now owes me money, so I'll send them a cwise probe, and maybe send some other peers an fwise one for it
  },
  _handlePleaseFinalize: function (msg) {
    if (this._forwardingTimers[msg.msgId]) {
      clearTimeout(this._forwardingTimers[msg.msgId])
      delete this._forwardingTimers[msg.msgId]
      this.send({
        msgType: 'REJECT',
        msgId: msg.msgId,
        reason: 'please-finalize message received'
      })
    } else {
      if (this._forwardedPending[msg.msgId]) {
        const forwardPeerHandler = this._agent._peerHandlers[this._forwardedPending[msg.msgId].toName]
        const forwardMsg = {
          msgType: 'PLEASE-FINALIZE',
          msgId: this._forwardedPending[msg.msgId].fwdMsgId
        }
        forwardPeerHandler.send(forwardMsg)
      }
    }
  },
  _handleCond: function (msg) {
    this._forwardingTimers[msg.msgId] = setTimeout(() => {
      this._doHandleCond(msg)
      delete this._forwardingTimers[msg.msgId]
    }, 100)
  },
  _doHandleCond: function (msg) {
    debug.log(`Agent ${this._myName} handles COND that comes in from ${this._peerName}`, msg)
    if (this._agent._preimages[msg.condition]) {
      debug.log('replying with fulfill!', msg.condition, this._agent._preimages[msg.condition].toString('hex'))
      const reply = {
        msgType: 'FULFILL',
        msgId: msg.msgId,
        preimage: this._agent._preimages[msg.condition].toString('hex')
      }
      this.send(reply)
      delete this._loopsStarted[msg.msgId];
    } else {
      debug.log('hashlock not mine', this._myName, msg.condition, Object.keys(this._agent._preimages))
      let suggestLowerAmount = false
      const thisBal = this.getBalance()
      for (let toName in this._agent._peerHandlers) {
        if (!this._agent._peerHandlers[toName]._probesReceived.fwise[msg.routeId]) {
          debug.log('not considering a forward to', toName, msg.routeId, this._agent._peerHandlers[toName]._probesReceived, 'because they never announced this routeId to me (never sent me an fwise probe).')
          continue
        }
        debug.log('considering a forward to', toName, thisBal, this._agent._peerHandlers[toName].getBalance())
        // when fowarding a COND, your incoming balance will increase and your outgoing balance will decrease
        // so it's useful if your outgoing balance is currently higher:
        const relBal = this._agent._peerHandlers[toName].getBalance() - thisBal
        // example: outBal is 4, inBal is 1; relBal is 3, amount is 2;
        // afterwards, outBal will be 2 and inBal will be 3, so relBal will be -1 (which is closer to zero than current 3)
        if (relBal > msg.amount) { // neighbor is higher, forward it
          debug.log('forwarding!', relBal, msg.amount, this._peerName, this._myName, toName)
          const forwardMsg = this._agent._peerHandlers[toName].create(msg.amount, msg.condition, msg.routeId)
          this._forwardedPending[msg.msgId] = {
            toName,
            fwdMsgId: forwardMsg.msgId
          }
          this._agent._peerHandlers[toName]._pendingCond[forwardMsg.msgId] = {
            fromName: this._peerName,
            toName,
            msg
          }
          debug.log(`${this._myName} is forwarding COND from ${this._peerName} to ${toName}`, msg)
          debug.log(`Probes seen at incoming peer`, this._ledger._probesReceived)
          debug.log(`Probes seen at outgoing peer`, this._agent._peerHandlers[toName]._ledger._probesReceived)
          this._agent._peerHandlers[toName].send(forwardMsg)
          return
        } else if (relBal > 0) {
          suggestLowerAmount = true
        } else {
          debug.log(`I don't want to forward this COND from ${this._peerName} to ${toName} because my balance with ${toName} is ${this._agent._peerHandlers[toName].getBalance()} and my balance with ${this._peerName} is ${thisBal}`)
        }
      }
      this.send({
        msgType: 'REJECT',
        msgId: msg.msgId,
        reason: (suggestLowerAmount ? 'try a lower amount' : 'not my hashlock and no onward route found')
      })
    }
  },

  _handleFulfill: function (msg) {
    // TODO: check whether the preimage is valid
    // see https://github.com/ledgerloops/ledgerloops/issues/36
    if (this._pendingCond[msg.msgId]) {
      const backer = this._pendingCond[msg.msgId].fromName
      debug.log('handling fulfill, backer found:', backer)
      debug.log('cond-level orig:', this._pendingCond[msg.msgId])
      const backMsg = {
        msgType: 'FULFILL',
        msgId: this._pendingCond[msg.msgId].msg.msgId,
        preimage: msg.preimage
      }
      debug.log(`Passing on FULFILL ${this._peerName} -> ${this._myName} -> ${backer}`, backMsg)
      this._agent._peerHandlers[backer].send(backMsg)
      delete this._agent._peerHandlers[backer]._forwardedPending[msg.msgId]
    } else {
      debug.log(this._myName + ': cannot find backer, I must have been the loop initiator.')
    }
  },

  _handleReject: function (msg) {
    console.log('handle reject!', msg);
    if (this._pendingCond[msg.msgId]) {
      console.log('pending cond!');
      const backer = this._pendingCond[msg.msgId].fromName
      delete this._agent._peerHandlers[backer]._forwardedPending[msg.msgId]
      const backMsg = {
        msgType: 'REJECT',
        msgId: this._pendingCond[msg.msgId].msg.msgId,
        reason: msg.reason
      }
      this._agent._peerHandlers[backer].send(backMsg)
    } else if ((this._loopsStarted[msg.msgId]) && (msg.reason === 'try a lower amount')) {
      console.log('loops started!');
      const loop = this._loopsStarted[msg.msgId];
      this._startLoop(loop.routeId, loop.fsidePeer, loop.amount/2);
      delete this._loopsStarted[msg.msgId];
    } 
    console.log('end of reject', this._loopsStarted);
  },

  /// /////////
  // PROBES //
  /// /////////

  //                           >>>> ADD >>>       >>>> ADD >>>
  //                             down | up          down | up
  //                           <<<< ACK <<<       <<<< ACK <<<

  //                 cside peer -[low|high]- agent -[low|high]- fside peer

  //                           < cwise PROBE <    < cwise PROBE <
  //                           > fwise PROBE >    > fwise PROBE >

  //                            <<< COND <<<      <<< COND <<<
  //                             up | down          up | down
  //                            > FULFILL >>      > FULFILL >>

  _handleProbe: function (msg) {
    msg.cwise = msg.cwise.filter(probe => {
      if (this._probesReceived.cwise[probe]) {
        console.log('cwise loop found!', this._myName, probe)
        return false
      } else {
        this._probesReceived.cwise[probe] = true
        return true
      }
    })
    msg.fwise = msg.fwise.filter(probe => {
      if (this._probesReceived.fwise[probe]) {
        console.log('fwise loop found!', this._myName, probe)
        for (let fsidePeer in this._agent._peerHandlers) {
          if (this._agent._peerHandlers[fsidePeer]._probesReceived.cwise[probe]) {
            console.log(`have fside peer for ${probe}, ${fsidePeer}`)

            // Let's just double-check the balances, and choose a loop amount
            // of half the diff:

            // our fside balance should be low because it will go up
            const fsideBal = this._agent._peerHandlers[fsidePeer].getBalance()

            // our cside balance should be high because it will go down
            const csideBal = this.getBalance()

            const diff = csideBal - fsideBal
            const amount = diff / 2
            debug.log('using loop', this._myName, { fsideBal, csideBal, diff, amount })
            this._startLoop(probe, fsidePeer, amount)
            break
          }
        }
        // FIXME: fside peer might still be found later?
        // see https://github.com/ledgerloops/ledgerloops/issues/35
        return false
      } else {
        this._probesReceived.fwise[probe] = true
        return true
      }
    })
    const thisBal = this.getBalance()
    for (let otherPeer in this._agent._peerHandlers) {
      this._agent._peerHandlers[otherPeer].considerProbe(thisBal, msg, this._peerName)
    }
  },

  // to be executed in cside peerHandler, where the fwise loop is detected:
  _startLoop: function (routeId, fsidePeer, amount) {
    // fsidePeer has sent us a fside probe, meaning they want to send a COND.
    // This Ledger said it's usable, so we should start a loop
    const preimage = randomBytes(256)
    const hashHex = sha256(preimage).toString('hex')
    this._agent._preimages[hashHex] = preimage
    if (amount < 0) {
      debug.log('amount below zero!', amount)
      panic() // eslint-disable-line no-undef
    }
    // the COND should be sent to this ledger's peer (cside):
    const msg = this.create(amount, hashHex, routeId)
    this.send(msg)
    this._loopsStarted[msg.msgId] = { routeId, fsidePeer, amount };
  },

  // to be executed on all other side when a probe comes in from one peer
  considerProbe: function (ourOtherBal, msg, receivedFromPeer) {
    console.log('considering probe; will forward cwise if this balance is higher and forward fwise if this balance is lower', { ourOtherBal, thisBal: this.getBalance(), myName: this._myName, peerName: this._peerName, receivedFromPeer, msg })
    if (this.getBalance() > ourOtherBal && msg.cwise.length) { // this balance is higher, potential cside, forward the cwise probes
      console.log(`${this._myName} is forwarding cwise probes from ${receivedFromPeer} to ${this._peerName}`)
      setTimeout(() => {
        this.send({
          msgType: 'PROBES',
          fwise: [],
          cwise: msg.cwise
        })
      }, 100)
    }
    if (this.getBalance() < ourOtherBal && msg.fwise.length) { // this balance is lower, potential fside, forward the fwise probes
      console.log(`${this._myName} is forwarding fwise probes from ${receivedFromPeer} to ${this._peerName}`)
      setTimeout(() => {
        this.send({
          msgType: 'PROBES',
          fwise: msg.fwise,
          cwise: []
        })
      }, 100)
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
  _createProbe: function () {
    // const newProbe = randomBytes(8).toString('hex');
    const newProbe = this._myName + '-' + randomBytes(8).toString('hex')
    this.send({
      msgType: 'PROBES',
      cwise: [ newProbe ],
      fwise: []
    })
    const thisBal = this.getBalance()
    for (let fsideLedger in this._agent._peerHandlers) {
      console.log(`considering sending fwise to ${fsideLedger}: \
${this._agent._peerHandlers[fsideLedger].getBalance()} ?< ${thisBal}`)
      // Our fside balance will go down, so find one whose balance is higher:
      if (this._agent._peerHandlers[fsideLedger].getBalance() < thisBal) {
        this._agent._peerHandlers[fsideLedger].send({
          msgType: 'PROBES',
          cwise: [],
          fwise: [ newProbe ]
        })
      }
    }
  }
}

module.exports = PeerHandler
