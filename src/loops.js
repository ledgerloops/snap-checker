var sha256 = require('./hashlocks').sha256;
var randomBytes = require('randombytes');

function Loops(agent) {
  this._agent = agent;
  this._probesSent = {};
  this._probesRcvd = {};
  this._preimages = {};
}

Loops.prototype = {
  _setRcvd: function (peerName, direction, routeId, value) {
    if (typeof this._probesRcvd[peerName] === 'undefined') {
      this._probesRcvd[peerName] = {
        cwise: {},
        fwise: {}
      };
    }
    this._probesRcvd[peerName][direction][routeId] = value;
  },
  _setSent(peerName, direction, routeId, value) {
    if (typeof this._probesSent[peerName] === 'undefined') {
      this._probesSent[peerName] = {
        cwise: {},
        fwise: {}
      };
    }
    this._probesSent[peerName][direction][routeId] = value;
  },
  getResponse: function (peerName, msgObj) {
    console.log('getResponse', peerName, msgObj);
    if (msgObj.msgType === 'ADD') {
      const routeId = randomBytes(8).toString('hex');
      console.log('starting probe after ACK to', peerName, routeId);
      this._setSent(peerName, 'cwise', routeId, false);
      this._setRcvd(peerName, 'fwise', routeId, true);
      return Promise.resolve({
        msgObj: {
          msgId: msgObj.msgId,
          msgType: 'ACK'
        },
        commit: true
      });
    }
    if (msgObj.msgType === 'COND') {
      if (this._preimages[msgObj.condition]) {
        return Promise.resolve({
          msgObj: {
            msgId: msgObj.msgId,
            msgType: 'FULFILL', 
            preimage: this._preimages[msgObj.condition].toString('hex')
          },
          commit: true
        });
      }
      for (let fwdPeerName in this._probesRcvd) {
        if (this._probesRcvd[fwdPeerName].fwise[msgObj.routeId]) {
          console.log('forwarding from', peerName, 'to', fwdPeerName);
          this._agent._propose(fwdPeerName, msgObj.amount, msgObj.condition, msgObj.routeId).then((result) => {
            console.log('passing back fulfill', peerName, fwdPeerName, result);
            return {
              msgObj: {
                msgId: msgObj.msgId,
                msgType: 'FULFILL',
                preimage: result
              },
              commit: true
            };
          }, (err) => {
            return {
              msgObj: {
                msgId: msgObj.msgId,
                msgType: 'REJECT',
                reason: err.message
              },
              commit: false
            };
          });
          break;
        }
      }
      return Promise.resolve({
        msgObj: {
          msgId: msgObj.msgId,
          msgType: 'REJECT',
          reason: 'cannot route ' + msgObj.routeId
        },
        commit: false
      });
    }
    return Promise.reject({
      msgObj: {
        msgId: msgObj.msgId,
        msgType: 'REJECT',
        reason: 'Loops handler not implemented yet'
      },
      commit: false
    });
  },
  handleControlMessage: function (peerName, msgObj) {
    if (msgObj.msgType === 'PROBES') {
      console.log('handling probes', peerName, msgObj);
      ['cwise', 'fwise'].map(direction => {
        msgObj[direction].map(routeId => {
          this._setRcvd(peerName, direction, routeId, true);
        });
      });
    }
  },
  _considerPair: function (from, to, direction, balanceDiff) {
    if (!this._probesRcvd[from]) {
      return;
    }
    console.log('considering pair', from, to, direction);
    for (let routeId in this._probesRcvd[from][direction]) {
      if (this._probesSent[to] && this._probesSent[to][direction][routeId]) {
        if (direction == 'cwise' && balanceDiff > 0) {
          console.log('LOOP FOUND!');
          const preimage = randomBytes(32);
          const hashHex = sha256(preimage).toString('hex');
          this._preimages[hashHex] = preimage;
          this._agent._propose(to, balanceDiff, hashHex, routeId).then(preimage => {
            console.log('that worked!', routeId);
          }, (err) => {
            console.log('that did not work!', routeId, err.message);
          });
        }
      } else {
        this._setSent(to, direction, routeId, false);
      }
    }
  },
  forwardProbes: function () {
    // a cwise probe should be forwarded to peers whose balance is lower
    // an fwise probe should be forwarded to peers whose balance is higher
    const balances = this._agent.getBalances();
    let ladder = [];
    for (let peerName in balances) {
      ladder.push(peerName);
    }
    ladder.sort((a, b) => balances[a].current - balances[b].current);
    for (let i = 0; i < ladder.length; i++) {
      if (ladder[i] === 'bank') {
        continue;
      }
      for (let j = i + 1; j < ladder.length; j++) {
        if (ladder[j] === 'bank') {
          continue;
        }
        console.log(`The balance of ${ladder[i]} (${balances[ladder[i]].current}) is lower than that of ${ladder[j]} (${balances[ladder[j]].current}), forwarding fwise and v.v.`);
        this._considerPair(ladder[i], ladder[j], 'fwise');
	this._considerPair(ladder[j], ladder[i], 'cwise',
          + balances[ladder[j]].current
          - balances[ladder[j]].payable
          - balances[ladder[i]].current
          - balances[ladder[i]].receivable
        );
      }
    }
  },
  sendProbes: function () {
    for (let peerName in this._probesSent) {
      let msgObj = {
        msgType: 'PROBES',
        cwise: [],
        fwise: []
      };
      ['cwise', 'fwise'].map(direction => {
        for (let routeId in this._probesSent[peerName][direction]) {
          if (!this._probesSent[peerName][direction][routeId]) {
            console.log('sending out', peerName, direction, routeId);
            this._probesSent[peerName][direction][routeId] = true;
            msgObj[direction].push(routeId);
          }
        }
      });
      console.log('sending probes', peerName, msgObj);
      this._agent._sendCtrl(peerName, msgObj);
    }
  }
};

module.exports = Loops;
