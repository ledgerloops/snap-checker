const Agent = require('../..').Agent;

const NUM_AGENTS = 10;

let agents = [];

for (let i = 0; i < NUM_AGENTS; i++) {
  agents[i] = new Agent('name-'+i, 'secret-'+i, () => true);
}

for (let i = 0; i < NUM_AGENTS; i++) {
  const next = (i+1) % NUM_AGENTS;
  const donation = agents[i].create('name-' + next, 1);
  agents[i].send('name-' + next, donation);
}
