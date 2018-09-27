Make sure to close http://localhost:8000 before opening the servers, due to
https://github.com/ledgerloops/ledgerloops/issues/45:

server on 8081:
```sh
PORT=8081 NAME=Marsellus SECRET=boo NEIGHBORS="{\"Vincent\":\"http://localhost:8082\"}" DONATION="Mia" node examples/server-server/agent-heroku.js
```

server on 8082:
```sh
PORT=8082 NAME=Vincent SECRET=Vega NEIGHBORS="{\"Marsellus\":\"http://localhost:8081\"}" node examples/server-server/agent-heroku.js
```

For client-side:
```sh
python -m SimpleHTTPServer
```

Then visit the client-side page on http://localhost:8000
