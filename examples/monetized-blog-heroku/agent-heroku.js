const Agent = require('../..').Agent;
const agent = new Agent('blogger', 'payme');

const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true
});

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

async function runSql(query) {
  try {
    const client = await pool.connect();
    const result = await client.query(query);
    const results = { 'results': (result) ? result.rows : null};
    return results;
    client.release();
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
}

runSql('SELECT now();').then(result => {
  console.log({ result });
});
console.log('listening on port', process.env.PORT);
agent.listen({ port: parseInt(process.env.PORT), handler });
