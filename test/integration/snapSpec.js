const { Agent, unregisterNames } = require('../../src/index');
const assert = require('chai').assert;

describe('Snap', function () {
  beforeEach(function () {
    this.agents= {
      Mia: new Agent('Mia'),
      Marsellus: new Agent('Marsellus'),
      Vincent: new Agent('Vincent')
    };
    return this.agents.Mia.addTransaction('Vincent', 100);
    // this.agents.Vincent.addTransaction('Marsellus', 100);
    // this.agents.Marsellus.addTransaction('Mia', 100);
  });

  afterEach(function () {
    unregisterNames();
  });

  it('should complete a payment', function (done) {
    const balancesMia = this.agents.Mia.getBalances();
    assert.deepEqual(balancesMia, {
      bank: { current: -100, receivable: 0, payable: 0 },
      Vincent: { current: 100, receivable: 0, payable: 0 }
    });
    done();
  });
});
