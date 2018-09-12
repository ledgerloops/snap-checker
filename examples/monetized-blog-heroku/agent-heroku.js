var Agent = require('../..').Agent;

var agent = new Agent('heroku', true);

var http = require('http');
var fs = require('fs');
var htmlPage = fs.readFileSync('./examples/monetized-blog-heroku/index.html');

var server = http.createServer((req, res) => {
  if (req.url == '/') {
    res.writeHead(200);
    res.end(htmlPage);
  } else {
    res.writeHead(404);
    res.end('Page not found');
  }
});
console.log('listening on port', process.env.PORT);
server.listen(parseInt(process.env.PORT));
agent.ensurePeer('reader', server);
