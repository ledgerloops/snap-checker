var sha256 = require('./hashlocks').sha256;
var randomBytes = require('randombytes');

function Loops(agent) {
  this._agent = agent;
  this._probesSent = {};
  this._probesRcvd = {};
}

Loops.prototype = {
  getResponse: function (peerName, msgObj) {
    if (msgObj.msgType === 'ADD') {
      return Promise.resolve({
        msgObj: {
          msgId: msgObj.msgId,
          msgType: 'ACK'
        },
        commit: true
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
      if (typeof this._probesRcvd[peerName] === 'undefined') {
        this._probesRcvd[peerName] = {
          cwise: {},
          fwise: {}
        };
      }
      ['cwise', 'fwise'].map(direction => {
        msgObj[direction].map(routeId => {
          this._probesRcvd[peerName][direction][routeId] = true;
        });
      });
    }
  },
  _considerPair: function (from, to, direction) {
    const oppositeDirection = (direction === 'fwise' ? 'cwise' : 'fwise');
    if (typeof this._probesSent[to] === 'undefined') {
      this._probesSent[to] = {
        cwise: {},
        fwise: {}
      };
    }
    if (typeof this._probesRcvd[from] === 'undefined' || typeof this._probesRcvd[from][direction].length === 0) {
      this._probesSent[to][direction]['null'] = false;
    } else {
      for (let routeId in this._probesRcvd[from][direction]) {
        if (this._probesSent[to][direction][routeId]) {
          console.log('LOOP FOUND!');
        } else {
          this._probesSent[to][direction][routeId] = false;
        }
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
        this._considerPair(ladder[i], ladder[j], 'cwise');
        this._considerPair(ladder[j], ladder[i], 'fwise');
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
          if (routeId === 'null') {
            delete this._probesSent[peerName][direction][routeId];
            msgObj[direction].push(randomBytes(8).toString('hex'));
          } else if (!this._probesSent[peerName][direction][routeId]) {
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
