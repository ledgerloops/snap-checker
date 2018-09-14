// Note that this module acts a a singleton, as it connects the various agents
// within one simulation process:
function Messaging() {
  this.channels = {};
  this.queue = [];
  this.autoFlush = false;
}

Messaging.prototype = {
  sendOneMessage: function (obj) {
    console.log('send one message!');
    if (typeof this.channels[obj.chanId] === 'undefined') {
      console.error('Unknown chanId', obj.chanId);
      return Promise.reject(new Error('unknown chanId'));
    }
    console.log(obj.chanId, JSON.parse(obj.msg));
    return this.channels[obj.chanId](obj.msg);
  },
  
  flush: function () {
    var iteration = this.queue;
    var cursor = 0;
    this.queue = [];
    function handleNextMessages() {
      if (cursor === iteration.length) {
        return Promise.resolve();
      }
      console.log('flushing message', cursor);
      return this.sendOneMessage(iteration[cursor]).then(() => {
        console.log('done flushing message', cursor);
        console.log(`Queue now has ${this.queue.length} messages, iteration has ${iteration.length}.`);
        cursor++;
        return handleNextMessages();
      });
    }
  
    console.log(`Flushing ${iteration.length} messages:`);
    console.log(iteration);
  
    return handleNextMessages().then(() => {
      return iteration;
    });
  },

  addChannel: function(myNick, peerNick, cb) {
    var chanId = `${myNick} -> ${peerNick}`;
    var chanIdBack = `${peerNick} -> ${myNick}`;
    this.channels[chanId] = cb;
    console.log(`Messaging channel for ${chanId} created.`);
    return (msg) => {
      console.log('messaging in addChannel-created send function', myNick, peerNick, msg);
      if (this.autoFlush) {
        return this.sendOneMessage({ chanId: chanIdBack, msg });
      } else {
        this.queue.push({ chanId: chanIdBack, msg });
        console.log(JSON.parse(msg));
        return Promise.resolve();
      }
    };
  },
  getQueue: function() { return this.queue; },
  discardQueue: function() { this.queue = []; }
};
