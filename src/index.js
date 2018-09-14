var PeerHandler = require('./peerhandler');

function Agent(myNick) {
  this._myNick = myNick;
  this._peerHandlers = {};
  this._preimages = {};
}

Agent.prototype.ensurePeer = function(peerNick, channel) {
  if (typeof this._peerHandlers[peerNick] === 'undefined') {
    console.log('agent gets new peer handler', { peerNick, channel });
    this._peerHandlers[peerNick] = new PeerHandler(peerNick, this._myNick, 'UCR', this, channel);
  }
};

module.exports = {
  Agent
};
