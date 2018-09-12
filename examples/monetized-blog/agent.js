var debug = require('../..').debug;
var Agent = require('../..').Agent;

var agent = new Agent('blogger', true);
agent.ensurePeer('reader', 8080);

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
