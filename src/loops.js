var sha256 = require('./hashlocks').sha256;

function Loops(agent) {
  this.agent = agent;
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
  handleControlMessage: function () {
    // not implemented yet
  }
};

module.exports = Loops;
