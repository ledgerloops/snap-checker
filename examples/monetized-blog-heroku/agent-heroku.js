var Agent = require('../..').Agent;

var agent = new Agent('heroku', process.env.SECRET, () => true);

var http = require('http');
var fs = require('fs');
var htmlPage = fs.readFileSync('./examples/monetized-blog-heroku/index.html');

var handler = (req, res) => {
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
