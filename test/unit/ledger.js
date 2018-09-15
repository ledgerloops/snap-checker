var Ledger = require('../../src/ledger')
var debug = require('../../src/debug')
var assert = require('assert')
// var sinon = require('sinon');

debug.setLevel(false)

describe('Ledger', function () {
  beforeEach(function() {
    // function Ledger (peerNick, myNick, unit, handler, medium) {
    this.ledger = new Ledger('Bob', 'Alice', 'UCR', {}, { addChannel: () => {} })
  })
  describe('Ledger#create', function () {
    it('should exist', function () {
      assert.strictEqual(typeof this.ledger.create, 'function');
    })
  })
})
