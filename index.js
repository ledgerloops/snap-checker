var Peer = require('ledgerloops-peer');
var Routing = require('ddcd-dfs');

function Agent() {
  this._routing = new Routing();
  this._peers = {};
};

Agent.prototype.addPeer = function(nick, sendToExternal) {
  this._peers[nick] = new Peer(nick, sendToExternal,
      this._routing.send, this._routing.updateNeighborStatus);
};

Agent.prototype.getPeer = function(nick) {
  return this._peers[nick];
};

module.exports = Agent;
