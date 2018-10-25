const Agent = require('../../src/index').Agent
const assert = require('chai').assert

describe('Snap', function () {
  beforeEach(function () {
    this.agents= {
      Mia: new Agent('Mia'),
      Marsellus: new Agent('Marsellus'),
      Vincent: new Agent('Vincent')
    };
    this.agents.Mia.addTransaction('Vincent', 100);
    this.agents.Vincent.addTransaction('Marsellus', 100);
    this.agents.Marsellus.addTransaction('Mia', 100);
  });

  afterEach(function () {
  });

  it('should resolve a triangle', function () {
    const balancesMia = this.agents.Mia.getBalances();
    console.log(balancesMia);
  });
});
