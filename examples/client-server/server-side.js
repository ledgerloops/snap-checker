var debug = require('../..').debug;
var Agent = require('../..').Agent;

var agents = {
};

function ensureAgent(nick) {
  if (typeof agents[nick] === 'undefined') {
    agents[nick] = new Agent(nick, true);
  }
}

ensureAgent('Marsellus');
agents['Marsellus'].ensurePeer('Mia', 8081);
agents['Marsellus'].ensurePeer('Vincent', 8082);

debug.setLevel(true);

function displayAgents() {
  var text = '-------------------------------------\n';
  for (var nick in agents) {
    text += `${nick}:\n`;
    for (var neighbor in agents[nick]._ledgers) {
      text += ` * Ledger with ${neighbor}: ${agents[nick]._ledgers[neighbor].getBalance()}\n`;
      let k;
      for (k in agents[nick]._ledgers[neighbor]._committed) {
        const entry = agents[nick]._ledgers[neighbor]._committed[k];
        text += `    -> Entry ${k}: ${entry.msgType} ${entry.beneficiary} ${entry.amount}\n`;
      }
      for (k in agents[nick]._ledgers[neighbor]._pending) {
        const entry = agents[nick]._ledgers[neighbor]._pending[k];
        text += `    (...entry ${k}: ${entry.msgType} ${entry.beneficiary} ${entry.amount})\n`;
      }
    }
  }
  console.log(text);
}

// setTimeout(() => {
//   const msg = agents['Marsellus']._ledgers['Mia'].create(1);
//   agents['Marsellus']._ledgers['Mia'].send(msg);
// }, 10000);
// setInterval(displayAgents, 1000);
