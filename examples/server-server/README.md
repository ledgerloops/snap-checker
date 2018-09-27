Make sure to close http://localhost:8000 before opening the servers, due to
https://github.com/ledgerloops/ledgerloops/issues/45:

server on 8081:
```sh
PORT=8081 SECRET=pssst TESTNET_FRIENDS=http://localhost:8082 DONATION=Mia node examples/server-server/agent-heroku.js
```

server on 8082:
```sh
PORT=8082 SECRET=boo TESTNET_FRIENDS=http://localhost:8081 node examples/server-server/agent-heroku.js

```

For client-side:
```sh
python -m SimpleHTTPServer
```

Then visit the client-side page on http://localhost:8000
