// import { Agent, unregisterNames } from '../../src/index';

describe.skip("Snap", function() {
  // beforeEach(function () {
  //   this.agents = {
  //     Mia: new Agent('Mia'),
  //     Marsellus: new Agent('Marsellus'),
  //     Vincent: new Agent('Vincent')
  //   };
  //   return Promise.all([
  //     this.agents.Mia.addTransaction('Vincent', 100),
  //     this.agents.Vincent.addTransaction('Marsellus', 100),
  //     this.agents.Marsellus.addTransaction('Mia', 100)
  //   ]);
  // });

  // afterEach(function () {
  //   unregisterNames();
  // });

  it("should complete a payment", function() {
    // const balancesMia = this.agents.Mia.getBalances();
    // assert.deepEqual(balancesMia, {
    //   Marsellus: { current: -100, receivable: 0, payable: 0 },
    //   bank: { current: 0, receivable: 0, payable: 0 },
    //   Vincent: { current: 100, receivable: 0, payable: 0 }
    // });
  });
  // describe('with loops', function () {
  //   beforeEach(function () {
  //     console.log('round 1');
  //     return Promise.all(['Mia', 'Marsellus', 'Vincent'].map(agentName => {
  //       this.agents[agentName]._loops.forwardProbes();
  //       this.agents[agentName]._loops.sendProbes();
  //     })).then(() => {
  //       return new Promise(resolve => setTimeout(resolve, 0));
  //     }).then(() => {
  //       console.log('round 2');
  //       return Promise.all(['Mia', 'Marsellus', 'Vincent'].map(agentName => {
  //         this.agents[agentName]._loops.forwardProbes();
  //         this.agents[agentName]._loops.sendProbes();
  //       }));
  //     }).then(() => {
  //       return new Promise(resolve => setTimeout(resolve, 0));
  //     }).then(() => {
  //       console.log('round 3');
  //       return Promise.all(['Mia', 'Marsellus', 'Vincent'].map(agentName => {
  //         this.agents[agentName]._loops.forwardProbes();
  //         this.agents[agentName]._loops.sendProbes();
  //       }));
  //     }).then(() => {
  //       return new Promise(resolve => setTimeout(resolve, 0));
  //     }).then(() => {
  //       console.log('round 4');
  //       return Promise.all(['Mia', 'Marsellus', 'Vincent'].map(agentName => {
  //         this.agents[agentName]._loops.forwardProbes(agentName == 'Vincent');
  //         this.agents[agentName]._loops.sendProbes();
  //       }));
  //     }).then(() => {
  //       return new Promise(resolve => setTimeout(resolve, 0));
  //     });
  //   });
  //   it('should resolve the loop', function (done) {
  //     const timer = setInterval(() => {
  //       let someoneStillBusy = false;
  //       ['Mia', 'Marsellus', 'Vincent'].map(agentName => {
  //         if (this.agents[agentName].busy > 0) {
  //           someoneStillBusy = true;
  //         }
  //       });
  //       if (someoneStillBusy) {
  //         return;
  //       }
  //       clearInterval(timer);

  //       const balancesMia = this.agents.Mia.getBalances();
  //       assert.deepEqual(balancesMia, {
  //         Marsellus: { current: 0, receivable: 0, payable: 0 },
  //         bank: { current: 0, receivable: 0, payable: 0 },
  //         Vincent: { current: 0, receivable: 0, payable: 0 }
  //       });
  //       done();
  //     }, 5);
  //   });
  // });
});
