var Agent = require('../..').Agent;

var agent = new Agent('Marsellus', 'There is no you and me. Not no more.', () => true);

agent.addClient({
  peerUrl: 'http://localhost:8082',
  peerName: 'Vincent'
});

const donation = agent.create('Mia', 1);
agent.send('Mia', donation);

const port = 8081;
console.log('listening on port', port);
agent.listen({ port: parseInt(port) });
