var Agent = LedgerLoops.Agent;

var agents = {
};

function ensureAgent(nick, secret) {
  if (typeof agents[nick] === 'undefined') {
    agents[nick] = new Agent(nick, secret);
  }
}

function sendAdd(from, to, amount, currency) {
  const msg = agents[from]._peerHandlers[to].create(amount);
  agents[from]._peerHandlers[to].send(msg);
}

if (typeof window !== 'undefined') {
  window.agents = agents;
  console.log('See window.agents.alice._peerHandlers');
}

function displayAgents() {
  var html = '';
  let loops = {};
  for (var nick in agents) {
    html += `<p>${nick}:</p><ul>`;
    for (var neighbor in agents[nick]._peerHandlers) {
      html += `<li>Ledger with ${neighbor}: ${agents[nick]._peerHandlers[neighbor].getBalance()}<ul>`;
      let k;
      for (k in agents[nick]._peerHandlers[neighbor]._ledger._committed) {
        const entry = agents[nick]._peerHandlers[neighbor]._ledger._committed[k];
        let sender = (k.startsWith('me') ? nick : neighbor);
        html += `<li><strong>Entry ${k}: ${entry.msgType} ${entry.beneficiary} ${entry.amount}</strong></li>`;
        if (entry.msgType === 'COND') {
          if (!loops[entry.routeId]) {
            loops[entry.routeId] = {
              start: sender 
            };
          }
          loops[entry.routeId][sender] = entry.beneficiary;
        }
      }
      for (k in agents[nick]._peerHandlers[neighbor]._ledger._pending) {
        const entry = agents[nick]._peerHandlers[neighbor]._ledger._pending[k];
        html += `<li>(entry ${k}: ${entry.msgType} ${entry.beneficiary} ${entry.amount})</li>`;
      }
      displayProbes = (x, dir) => {
        if (Object.keys(x[dir]).length) {
          html += `<li>${dir} probes: "${Object.keys(x[dir]).join('", "')}"</li>`;
        } else {
          html += `<li>(no ${dir} probes)</li>`;
        }
      };
      displayProbes(agents[nick]._peerHandlers[neighbor]._probesReceived, 'cwise');
      displayProbes(agents[nick]._peerHandlers[neighbor]._probesReceived, 'fwise');

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

ensureAgent('Mia', 'Wallace');
agents['Mia'].addClient({
  peerName: 'Marsellus',
  peerUrl: 'ws://localhost:8081'
});
agents['Mia'].addClient({
  peerName: 'Vincent',
  peerUrl: 'ws://localhost:8082'
});

setTimeout(() => sendAdd('Mia', 'Vincent', 1, 'USD'), 2000);

setInterval(displayAgents, 1000);
