var Agent = require('../..').Agent;
var myName = process.env.NAME;
var mySecret = process.env.SECRET;
var agent = new Agent(process.env.NAME, process.env.SECRET, () => true);

if (process.env.NEIGHBORS) {
  try {
    var neighbors = JSON.parse(process.env.NEIGHBORS);
    for (let peerName in neighbors) {
      agent.addClient({
        peerUrl: neighbors[peerName],
        peerName
      });
    }
  } catch (e) {
    console.error('could not parse neighbor config', process.env.NEIGHBORS);
    process.exit();
  }
}

const port = process.env.PORT;
console.log('listening on port', port);
agent.listen({ port: parseInt(port) });

if (process.env.DONATION) {
  const donation = agent.create(process.env.DONATION, 1);
  agent.send('Mia', donation);
}
