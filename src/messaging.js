// This is just for the demo, in a real implementation you would only run one
// agent, and use a real messaging protocol to securely connect with other agents

var debug = require('./debug');

const WebSocket = require('isomorphic-ws');
 
// Note that this module acts a a singleton, as it connects the various agents
// within one simulation process:
var channels = {};
var queue = [];
var autoFlush = false;

function sendOneMessage(obj) {
  if (typeof channels[obj.chanId] === 'undefined') {
    console.error('Unknown chanId', obj.chanId);
    return Promise.reject(new Error('unknown chanId'));
  }
  debug.log(obj.chanId, JSON.parse(obj.msg));
  return channels[obj.chanId](obj.msg);
}

function flush() {
  var iteration = queue;
  var cursor = 0;
  queue = [];
  function handleNextMessages() {
    if (cursor === iteration.length) {
      return Promise.resolve();
    }
    debug.log('flushing message', cursor);
    return sendOneMessage(iteration[cursor]).then(() => {
      debug.log('done flushing message', cursor);
      debug.log(`Queue now has ${queue.length} messages, iteration has ${iteration.length}.`);
      cursor++;
      return handleNextMessages();
    });
  }

  debug.log(`Flushing ${iteration.length} messages:`);
  debug.log(iteration);

  return handleNextMessages().then(() => {
    return iteration;
  });
}

module.exports = {
  addChannel: function(medium, myNick, peerNick, cb) {
    if (typeof medium == 'number') {
      const wss = new WebSocket.Server({ port: medium });
      console.log(`${myNick} is listening for ${peerNick} on ws://localhost:${medium}.`);
      let peer;
      wss.on('connection', function connection(ws) {
        if (!peer) {
          console.log(`Client ${peerNick} has connected to server ${myNick} on port ${medium}!`);
          peer = ws;
        }
        ws.on('message', (msg) => {
          console.log(`Server ${myNick} receives message from client ${peerNick}`, msg);
          cb(msg);
        });
      });
      return (msg) => {
        if (!peer) {
          console.log(`failed to send message from ${myNick} to ${peerNick} because nobody is connected on port ${medium}.`);
        } else {
          console.log(`sending message from server ${myNick} to client ${peerNick}`, msg);
          peer.send(msg);
        }
      };
    } else if (typeof medium == 'string') {
      const ws = new WebSocket(medium);
      let open = false;
      ws.onopen = () => {
        open = true;
        console.log(`Client ${myNick} is connected to server ${peerNick} over ${medium}.`);
      };
      
      ws.onmessage = (msg) => {
        console.log(`Client ${myNick} receives message from server ${peerNick}`, msg);
        cb(msg.data);
      };

      return (msg) => {
        if (!open) {
          console.log(`failed to send message from client ${myNick} to server ${peerNick} because nobody is listening on ${medium}.`);
        } else {
          console.log(`sending message from client ${myNick} to server ${peerNick}`, msg);
          ws.send(msg);
        }
      };
    } else {
      var chanId = `${myNick} -> ${peerNick}`;
      var chanIdBack = `${peerNick} -> ${myNick}`;
      channels[chanId] = cb;
      debug.log(`Messaging channel for ${chanId} created.`);
      return (msg) => {
        if (autoFlush) {
          return sendOneMessage({ chanId: chanIdBack, msg });
        } else {
          queue.push({ chanId: chanIdBack, msg });
          debug.log(JSON.parse(msg));
          return Promise.resolve();
        }
      };
    }
  },
  flush,
  autoFlush: function() { autoFlush = true; },
  getQueue: function() { return queue; },
  discardQueue: function() { queue = []; },
};
