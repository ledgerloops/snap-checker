var Agent = require('../..').Agent;

var agent = new Agent('blogger', true);
agent.ensurePeer('reader', 8080);

function displayAgents() {
  var text = '-------------------------------------\n';
  for (var nick in agents) {
    text += `${nick}:\n`;
    for (var neighbor in agents[nick]._peerHandlers) {
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
