var Peer = require('ledgerloops-peer');
var Routing = require('ddcd-dfs');

function Agent() {
  this._routing = new Routing();
  this._peers = {};
};

Agent.prototype.addPeer = function(myNick, theirNick, sendToExternal) {
  this._peers[theirNick] = new Peer(myNick, theirNick, sendToExternal,
      this._routing.send.bind(this._routing), this._routing.updateNeighborStatus.bind(this._routing));
};

Agent.prototype.getPeer = function(theirNick) {
  return this._peers[theirNick];
};

module.exports = Agent;
