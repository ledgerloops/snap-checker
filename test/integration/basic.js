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
      messaging.setCallback(receiver, function(from, obj) {
        nodes[receiver].getPeer(from).handleIncomingMessage(obj);
      });
      for (var sender in nodes) {
        nodes[sender].addPeer(receiver, function(obj) {
          messaging.send(sender, receiver, obj);
        });
      }
    }
  });
  describe('A sends IOU to B', function() {
    beforeEach(function() {
      nodes.a.getPeer('b').sendIOU({});
    });
  
    it('should send the IOU', function() {
    });
  });
});
