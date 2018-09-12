Open two terminal windows; in the one for client-side, run:

```sh
cd .
python -m SimpleHTTPServer
```

or a similar static webserver for this folder.

Now open http://localhost:8000 in your browser. This demo is similar to the in-browser demo in that it uses 'ledgerloops.js' (the Browserified result of `npm run build`) to display some demo about debts and loops between Pulp Fiction characters. Except this time, the demo has Mia and Vincent on the client-side, and they will try to connect to Marsellus over a WebSocket. In particular, Mia will try to connect to Marsellus on ws://localhost:8081, and Vincent will try to connect to him on ws://localhost:8082.

So in the other window, run `node ./server-side.js` to run a server that will open those two WebSocket servers, with Marsellus sitting behind.

Currently, the WebSockets don't reconnect, and don't retry to connect, so after you started the server-side script, you should refresh the client-side page in your browser. That way, Mia and Vincent will try again to connect to Marsellus.

Note that the server-side script requires the ledgerloops package (which it includes from `'../..'`, but in your application you would just require it from npm), and also that it requiresa the `'ws'` package for the WebSocket servers, so make sure that you ran `npm install` in the repo root.
