const { Agent, unregisterNames } = require('../../src/index');
const assert = require('chai').assert;

describe('Snap', function () {
  beforeEach(function () {
    this.agents= {
      Mia: new Agent('Mia'),
      Marsellus: new Agent('Marsellus'),
      Vincent: new Agent('Vincent')
    };
    this.agents.Mia.addTransaction('Vincent', 100);
    // this.agents.Vincent.addTransaction('Marsellus', 100);
    // this.agents.Marsellus.addTransaction('Mia', 100);
  });

  afterEach(function () {
    unregisterNames();
  });

  it('should prepare a payment', function (done) {
    setTimeout(() => {
      const balancesMia = this.agents.Mia.getBalances();
      assert.deepEqual(balancesMia, {
        bank: { current: 0, receivable: 0, payable: 100 },
        Vincent: { current: 0, receivable: 100, payable: 0 }
      });
      done();
    }, 0);
  });

  it('should complete a payment', function (done) {
    setTimeout(() => {
      const balancesMia = this.agents.Mia.getBalances();
      assert.deepEqual(balancesMia, {
        bank: { current: -100, receivable: 0, payable: 0 },
        Vincent: { current: 100, receivable: 0, payable: 0 }
      });
      done();
    }, 10);
  });
});
