var LedgerLoops = require('../../index.js');
var Messaging = require('../helpers/messaging');
var assert = require('assert');
var sinon = require('sinon');

describe('basic', function() {
  var messaging;
  var nodes = {};
  beforeEach(function() {
    messaging = new Messaging();
    nodes = {
      a: new LedgerLoops(),
      b: new LedgerLoops(),
      c: new LedgerLoops(),
    };
    for (var receiver in nodes) {
      ((receiver) => {
        messaging.setCallback(receiver, function(from, obj) {
          nodes[receiver].getPeer(from).handleIncomingMessage(obj);
        });
        for (var sender in nodes) {
          ((sender) => {
            nodes[sender].addPeer(sender, receiver, function(obj) {
              messaging.send(sender, receiver, obj);
            });
          })(sender);
        }
      })(receiver);
    }
  });
  describe('A sends IOU to B', function() {
    beforeEach(function() {
      nodes.a.getPeer('b').sendIOU('note from a', { USD: 1 });
    });

    it('should send the IOU', function() {
      assert.deepEqual(messaging.log, [
        {
          from: 'a',
          to: 'b',
          obj: { previousHash: null,
            protocol: 'local-ledgers-0.3',
            msgType: 'initiate-update',
            note: {},
            debtor: 'a',
            note: 'note from a',
            addedDebts: {
              USD: 1,
            },
            hash: 'some-hash',
          },
        },
        {
          from: 'b',
          to: 'a',
          obj: {
            msgType: 'confirm-update',
            hash: 'some-hash',
          },
        },
      ]);
    });
  });
});
