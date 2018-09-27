const debug = require('./debug')
var shajs = require('sha.js')

function sha256 (x) {
  return shajs('sha256').update(x).digest()
}

function verifyHash (preimageHex, hashHex) {
  const preimage = Buffer.from(preimageHex, 'hex')
  const correctHash = sha256(preimage)
  return Buffer.from(hashHex, 'hex').equals(correctHash)
}

function Ledger (peerName, myName, unit, handler) {
  this._peerName = peerName
  this._myName = myName
  this._unit = unit
  this._currentBalance = {
    [peerName]: 0,
    [myName]: 0
  }
  this._pendingBalance = {
    [peerName]: 0,
    [myName]: 0
  }
  this._committed = {}
  this._pendingMsg = {}
  this._handler = handler
  this.myNextId = 0
}

Ledger.prototype = {
  create: function (amount, condition, routeId) {
    if (condition) {
      return {
        msgType: 'COND',
        msgId: this.myNextId++,
        beneficiary: this._peerName,
        amount,
        unit: this._unit,
        condition,
        routeId
      }
    } else {
      return {
        msgType: 'ADD',
        msgId: this.myNextId++,
        beneficiary: this._peerName,
        amount,
        unit: this._unit
      }
    }
  },
  handleMessage: function (msg, outgoing) {
    console.log(`${this._myName} handles message ${(outgoing ? 'to' : 'from')} ${this._peerName}`, msg);
    let proposer
    if (outgoing) {
      if (['ADD', 'COND', 'PLEASE-FINALIZE'].indexOf(msg.msgType) !== -1) {
        proposer = 'me'
      } else {
        proposer = 'you'
      }
    } else {
      if (['ADD', 'COND', 'PLEASE-FINALIZE'].indexOf(msg.msgType) !== -1) {
        proposer = 'you'
      } else {
        proposer = 'me'
      }
      if (typeof msg !== 'object') {
        console.error('discarding non-object message from peer', msg)
        return
      }
    }
    debug.log('Handling', msg)
    switch (msg.msgType) {
      case 'ADD': {
        this._pendingBalance[msg.beneficiary] += msg.amount
        this._pendingMsg[`${proposer}-${msg.msgId}`] = msg
        this._pendingMsg[`${proposer}-${msg.msgId}`].date = new Date().getTime();
        if (!outgoing) {
          this._handler._handleAdd(msg)
        }
        break
      }
      case 'PLEASE-FINALIZE': {
        if (!outgoing) {
          this._handler._handlePleaseFinalize(msg)
        }
        break
      }
      case 'COND': {
        this._pendingBalance[msg.beneficiary] += msg.amount
        this._pendingMsg[`${proposer}-${msg.msgId}`] = msg
        this._pendingMsg[`${proposer}-${msg.msgId}`].date = new Date().getTime();
        debug.log('COND - COND - COND', this._myName, this._pendingMsg)
        if (!outgoing) {
          this._handler._handleCond(msg)
        }
        break
      }
      case 'ACK': {
        const orig = this._pendingMsg[`${proposer}-${msg.msgId}`]
        if (!orig) {
          debug.log('panic! ACK for non-existing orig', this._pendingMsg, msg)
          panic() // eslint-disable-line no-undef
        }
        this._pendingBalance[orig.beneficiary] -= orig.amount
        this._currentBalance[orig.beneficiary] += orig.amount
        this._committed[`${proposer}-${msg.msgId}`] = this._pendingMsg[`${proposer}-${msg.msgId}`]
        this._committed[`${proposer}-${msg.msgId}`].date = new Date().getTime();
        delete this._pendingMsg[`${proposer}-${msg.msgId}`]
        debug.log('Committed', msg)
        break
      }
      case 'FULFILL': {
        const orig = this._pendingMsg[`${proposer}-${msg.msgId}`]
        debug.log('FULFILL - FULFILL - FULFILL', this._myName, this._pendingMsg)
        if (!verifyHash(msg.preimage, orig.condition)) {
          console.log('no hash match!', msg, orig)
          return
        } else {
          console.log('hash match!')
        }
        this._pendingBalance[orig.beneficiary] -= orig.amount
        this._currentBalance[orig.beneficiary] += orig.amount
        this._committed[`${proposer}-${msg.msgId}`] = this._pendingMsg[`${proposer}-${msg.msgId}`]
        this._committed[`${proposer}-${msg.msgId}`].date = new Date().getTime();
        delete this._pendingMsg[`${proposer}-${msg.msgId}`]
        debug.log('Committed', msg)
        if (!outgoing) {
          this._handler._handleFulfill(msg)
        }
        break
      }
      case 'REJECT': {
        const orig = this._pendingMsg[`${proposer}-${msg.msgId}`]
        this._pendingBalance[orig.beneficiary] -= orig.amount
        delete this._pendingMsg[`${proposer}-${msg.msgId}`]
        debug.log('Rejected', msg)
        break
      }
      case 'PROBES': {
        if (!outgoing) {
          if (!Array.isArray(msg.cwise)) {
            console.error('PROBES message without a cwise array', msg)
            return
          }
          if (!Array.isArray(msg.fwise)) {
            console.error('PROBES message without an fwise array', msg)
            return
          }
          this._handler._handleProbe(msg)
        }
        break
      }
      default:
        console.log('unknown message type!', this._myName, this._peerName, msg)
    }
  },
  getBalance: function () {
    return this._currentBalance[this._myName] - this._currentBalance[this._peerName]
  }
}

module.exports = Ledger
