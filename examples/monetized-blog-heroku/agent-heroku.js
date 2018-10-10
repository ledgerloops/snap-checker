var Agent = require('../..').Agent;

var agent = new Agent('blogger', 'payme');

const fs = require('fs');
const htmlPage = fs.readFileSync('./examples/monetized-blog-heroku/index.html');

const handler = (req, res) => {
  if (req.url == '/') {
    res.writeHead(200);
    res.end(htmlPage);
  } else {
    res.writeHead(404);
    res.end('Page not found');
  }
};

if (typeof process.env.TESTNET_FRIENDS == 'string') {
  process.env.TESTNET_FRIENDS.split(',').map(friendWssUrl => {
    agent.addClient({
      peerUrl: friendWssUrl,
      peerName: friendWssUrl
    });
  });
}

console.log('listening on port', process.env.PORT);
agent.listen({ port: parseInt(process.env.PORT), handler });
