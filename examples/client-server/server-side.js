var Agent = require('../..').Agent;

var agent = new Agent('Marsellus', 'There is no me and you. Not no more.', ({ peerName, peerSecret }) => {
  if (peerName === 'Mia' && peerSecret === 'Wallace') {
    console.log('Mia in the house');
    return true;
  }
  if (peerName === 'Vincent' && peerSecret === 'Vega') {
    console.log('Vincent in the house');
    return true;
  }
  console.log('Who is this', peerName, peerSecret);
  return false;
});

agent.listen({ port: 8081 });

function displayAgent() {
  var text = '-------------------------------------\n';
  for (var neighbor in agent._peerHandlers) {
    console.log(`probes received from ${neighbor}`, agent._peerHandlers[neighbor]._probesReceived);
    text += ` * Ledger with ${neighbor}: ${agent._peerHandlers[neighbor].getBalance()}\n`;
    let k;
    for (k in agent._peerHandlers[neighbor]._ledger._committed) {
      const entry = agent._peerHandlers[neighbor]._ledger._committed[k];
      text += `    -> Entry ${k}: ${entry.msgType} ${entry.beneficiary} ${entry.amount}\n`;
    }
    for (k in agent._peerHandlers[neighbor]._ledger._pending) {
      const entry = agent._peerHandlers[neighbor]._ledger._pending[k];
      text += `    (...entry ${k}: ${entry.msgType} ${entry.beneficiary} ${entry.amount})\n`;
    }
  }
  console.log(text);
}

// setTimeout(() => {
//   const msg = agents['Marsellus']._peerHandlers['Mia'].create(1);
//   agents['Marsellus']._peerHandlers['Mia'].send(msg);
// }, 10000);
setInterval(displayAgent, 20000);
