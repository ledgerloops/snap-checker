var Agent = require('../..').Agent;

var agents = {
};

function ensureAgent(nick) {
  if (typeof agents[nick] === 'undefined') {
    agents[nick] = new Agent(nick);
  }
}

ensureAgent('Marsellus');
agents['Marsellus'].ensurePeer('Mia', 8081);
agents['Marsellus'].ensurePeer('Vincent', 8082);

function displayAgents() {
  var text = '-------------------------------------\n';
  for (var nick in agents) {
    text += `${nick}:\n`;
    for (var neighbor in agents[nick]._peerHandlers) {
      console.log(`probes received by ${nick} from ${neighbor}`, agents[nick]._peerHandlers[neighbor]._probesReceived);
      text += ` * Ledger with ${neighbor}: ${agents[nick]._peerHandlers[neighbor].getBalance()}\n`;
      let k;
      for (k in agents[nick]._peerHandlers[neighbor]._ledger._committed) {
        const entry = agents[nick]._peerHandlers[neighbor]._ledger._committed[k];
        text += `    -> Entry ${k}: ${entry.msgType} ${entry.beneficiary} ${entry.amount}\n`;
      }
      for (k in agents[nick]._peerHandlers[neighbor]._ledger._pending) {
        const entry = agents[nick]._peerHandlers[neighbor]._ledger._pending[k];
        text += `    (...entry ${k}: ${entry.msgType} ${entry.beneficiary} ${entry.amount})\n`;
      }
    }
  }
  console.log(text);
}

// setTimeout(() => {
//   const msg = agents['Marsellus']._peerHandlers['Mia'].create(1);
//   agents['Marsellus']._peerHandlers['Mia'].send(msg);
// }, 10000);
setInterval(displayAgents, 5000);
