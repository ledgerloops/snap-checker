const Agent = require('../..').Agent;
const bcrypt = require('bcrypt');
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
    const results = (result && result.rowCount) ? result.rows : null;
    console.log('sql results', result, results);
    client.release();
    return results;
  } catch (err) {
    console.error(err);
    throw err;
  }
}
const agent = new Agent('blogger', 'payme', (eventObj) => {
  return runSql('SELECT secretHash FROM users WHERE name=$1', [
    eventObj.peerName
  ]).then(results => {
    console.log('sql query result', results);
    if (results == null) {
      return bcrypt.hash(eventObj.peerSecret, 10).then((hash) => {
        console.log({ hash });
        return runSql('INSERT INTO users (name, secretHash) VALUES ($1, $2)', [
          eventObj.peerName,
          hash
        ]);
      }).then(() => {
        console.log('returning true');
        return true;
      });
    } else {
      const secretHash = results[0].secrethash;
      console.log('returning compare', eventObj, results, eventObj.peerSecret, secretHash);
      return bcrypt.compare(eventObj.peerSecret, secretHash);
    }
  });
}, runSql);

runSql('SELECT now();').then(result => {
  console.log({ result });
});
console.log('listening on port', process.env.PORT);
agent.listen({ port: parseInt(process.env.PORT), handler });
