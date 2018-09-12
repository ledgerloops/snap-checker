var debug = LedgerLoops.debug;
var Agent = LedgerLoops.Agent;
var messaging = LedgerLoops.messaging;

var agents = {
};

function ensureAgent(nick) {
  if (typeof agents[nick] === 'undefined') {
    agents[nick] = new Agent(nick, true);
  }
}

debug.setLevel(true);

messaging.autoFlush();

function sendAdd(from, to, amount, currency) {
  const msg = agents[from]._ledgers[to].create(amount);
  agents[from]._ledgers[to].send(msg);
}

if (typeof window !== 'undefined') {
  window.agents = agents;
  debug.log('See window.agents.alice._ledgers');
}

function displayAgents() {
  var html = '';
  let loops = {};
  for (var nick in agents) {
    html += `<p>${nick}:</p><ul>`;
    for (var neighbor in agents[nick]._ledgers) {
      html += `<li>Ledger with ${neighbor}: ${agents[nick]._ledgers[neighbor].getBalance()}<ul>`;
      let k;
      for (k in agents[nick]._ledgers[neighbor]._committed) {
        const entry = agents[nick]._ledgers[neighbor]._committed[k];
        html += `<li><strong>Entry ${k}: ${entry.msgType} ${entry.beneficiary} ${entry.amount}</strong></li>`;
        if (entry.msgType === 'COND') {
          if (!loops[entry.routeId]) {
            loops[entry.routeId] = {
              start: entry.sender
            };
          }
          loops[entry.routeId][entry.sender] = entry.beneficiary;
        }
      }
      for (k in agents[nick]._ledgers[neighbor]._pending) {
        const entry = agents[nick]._ledgers[neighbor]._pending[k];
        html += `<li>(entry ${k}: ${entry.msgType} ${entry.beneficiary} ${entry.amount})</li>`;
      }
      html += '</ul></li>';
    }
    html += `</ul>`;
  }
  for (let routeId in loops) {
    html += `<h2>Loop ${routeId}:</h2><p>`;
    let cursor = loops[routeId].start;
    do {
      html += `-> ${cursor}`;
      cursor = loops[routeId][cursor];
      if (!cursor) {
        break;
      }
    } while (cursor != loops[routeId].start);
    html += '</p>';
  }
  document.getElementById('data').innerHTML = html;
}

ensureAgent('Mia');
agents['Mia'].ensurePeer('Marsellus', 'ws://localhost:8081');
agents['Mia'].ensurePeer('Vincent');

ensureAgent('Vincent');
agents['Vincent'].ensurePeer('Marsellus', 'ws://localhost:8082');
agents['Vincent'].ensurePeer('Mia');

setTimeout(() => sendAdd('Mia', 'Vincent', 1, 'USD'), 2000);
setTimeout(() => sendAdd('Vincent', 'Marsellus', 1, 'USD'), 3000);
// And Marsellus has to do this server-side

setInterval(displayAgents, 1000);
