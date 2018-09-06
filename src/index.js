var debug = require('./debug');
var Agent = require('./agents');
var messaging = require('./messaging');

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
  [from, to].map(nick => {
    ensureAgent(nick);
  });
  agents[from].sendAdd(to, amount, currency);
}

if (typeof window !== 'undefined') {
  window.agents = agents;
  debug.log('See window.agents.alice._ledgers');
}

function displayAgents() {
  var html = '';
  for (var nick in agents) {
    html += `<p>${nick}:</p><ul>`;
    for (var neighbor in agents[nick]._ledgers) {
      html += `<li>Ledger with ${neighbor}: ${agents[nick]._ledgers[neighbor].getBalance()}<ul>`;
      let k;
      for (k in agents[nick]._ledgers[neighbor]._committed) {
        const entry = agents[nick]._ledgers[neighbor]._committed[k];
        html += `<li><strong>Entry ${k}: ${entry.msgType} ${entry.beneficiary} ${entry.amount}</strong></li>`;
      }
      for (k in agents[nick]._ledgers[neighbor]._pending) {
        const entry = agents[nick]._ledgers[neighbor]._pending[k];
        html += `<li>(entry ${k}: ${entry.msgType} ${entry.beneficiary} ${entry.amount})</li>`;
      }
      html += '</ul></li>';
    }
    html += `</ul>`;
  }
  document.getElementById('data').innerHTML = html;
}


function sendButton(amount) {
  var from = document.getElementById('sender').value;
  var to = document.getElementById('receiver').value;
  if (from.length === 0) {
    pickButton('sender');
    from = document.getElementById('sender').value;
  }
  if (to.length === 0) {
    pickButton('receiver');
    to = document.getElementById('receiver').value;
  }
  if (from === to) {
    window.alert('Receiver nick should be different from sender nick');
  } else {
    sendAdd(from, to, amount, 'USD');
  }
}

function pickAgent(actor) {
  var nicks = [
    'Marsellus',
    'Mia',
    'Vincent',
    'Jules',
    'Pumpkin',
    'Honeybunny',
    'Butch',
    'Fabienne',
  ];
  return nicks[Math.floor(Math.random()*nicks.length)];
}

function pickAgents(num, have = []) {
  if (num === 0) {
    return have;
  }
  var newAgent = pickAgent();
  if (have.indexOf(newAgent) !== -1) {
    // try again to pick one we don't have yet:
    return pickAgents(num, have);
  }
  have.push(newAgent);
  return pickAgents(num-1, have);
}

function pickButton(actor) {
  document.getElementById(actor).value = pickAgent();
}

document.getElementById('pick-sender').onclick = function() {
  pickButton('sender');
};

document.getElementById('pick-receiver').onclick = function() {
  pickButton('receiver');
};

document.getElementById('switch').onclick = function() {
  var oldSender = document.getElementById('sender').value;
  document.getElementById('sender').value = document.getElementById('receiver').value;
  document.getElementById('receiver').value = oldSender;
};

document.getElementById('send-1').onclick = function() {
  sendButton(1);
};

document.getElementById('send-5').onclick = function() {
  sendButton(5);
};

var initialAgents = ['Mia', 'Vincent', 'Marsellus'];
setTimeout(() => sendAdd(initialAgents[0], initialAgents[1], 1, 'USD'), 0);
setTimeout(() => sendAdd(initialAgents[1], initialAgents[2], 1, 'USD'), 1000);
setTimeout(() => sendAdd(initialAgents[2], initialAgents[0], 1, 'USD'), 2000);
setInterval(displayAgents, 1000);
