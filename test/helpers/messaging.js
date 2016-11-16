function Messaging() {
  this.queue = [];
  this._callbacks = {};
};

Messaging.prototype.setCallback = function(nick, cb) {
  this._callbacks[nick] = cb;
};

Messaging.prototype.send = function(from, to, obj) {
  this._callbacks[to](from, obj);
};

Messaging.prototype.queueMsg = function(from, to, obj) {
  this._queue.push({ from, to, obj });
};

Messaging.prototype.flush = function() {
  var iteration = this._queue;
  this._queue = [];
  for (var i=0; i<iteration.length; i++) {
    this.send(iteration[i].from, iteration[i].to, iteration[i].obj);
  }
};

module.exports = Messaging;
