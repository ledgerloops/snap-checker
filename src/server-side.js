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
  ensureAgent(from);
  ensureAgent(to);
  agents[from].ensurePeer(to);
  agents[to].ensurePeer(from);
  const msg = agents[from]._ledgers[to].create(amount);
  agents[from]._ledgers[to].send(msg);
}

if (typeof window !== 'undefined') {
  window.agents = agents;
  debug.log('See window.agents.alice._ledgers');
}

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

var initialAgents = ['Mia', 'Vincent', 'Marsellus'];
setTimeout(() => sendAdd(initialAgents[0], initialAgents[1], 1, 'USD'), 0);
setTimeout(() => sendAdd(initialAgents[1], initialAgents[2], 1, 'USD'), 100);
setTimeout(() => sendAdd(initialAgents[2], initialAgents[0], 1, 'USD'), 200);
setInterval(displayAgents, 1000);
