var sha256 = require('./hashlocks').sha256;

function Loops(agent) {
  this.agent = agent;
}

Loops.prototype = {
  getResponse: function (peerName, msgObj) {
    if (msgObj.msgType === 'ADD') {
      return Promise.resolve({
        msgId: msgObj.msgId,
        msgType: 'ACK'
      });
    }
    return Promise.resolve({
      msgId: msgObj.msgId,
      msgType: 'REJECT',
      reason: 'Loops handler not implemented yet'
    });
  },
  handleControlMessage: function () {
    // not implemented yet
  }
};
