var Agent = require('../..').Agent;

var agent = new Agent('Vincent', 'Vega', () => true);

agent.addClient({
  peerUrl: 'http://localhost:8081',
  peerName: 'Marsellus'
});

const port = 8082;
console.log('listening on port', port);
agent.listen({ port: parseInt(port) });
