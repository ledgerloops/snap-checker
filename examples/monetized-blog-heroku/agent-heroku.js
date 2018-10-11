const Agent = require('../..').Agent;

const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true
});

const fs = require('fs');
const htmlPage = fs.readFileSync('./examples/monetized-blog-heroku/index.html');

const handler = (req, res) => {
  console.log('handling http', req.url);
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

async function runSql(query, params) {
  console.log('running sql', query, params);
  try {
    const client = await pool.connect();
    const result = await client.query(query, params);
    const results = (result) ? result.rows : null;
    return results;
    client.release();
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
}
const agent = new Agent('blogger', 'payme', () => true, runSql);

runSql('SELECT now();').then(result => {
  console.log({ result });
});
console.log('listening on port', process.env.PORT);
agent.listen({ port: parseInt(process.env.PORT), handler });
