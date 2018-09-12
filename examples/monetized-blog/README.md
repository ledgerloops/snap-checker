Open two terminal windows; in the one for the blog itself, run:

```sh
cd .
python -m SimpleHTTPServer
```

or a similar static webserver for this folder.

Now open http://localhost:8000 in your browser. This is your static blog which you want to monetize. In order to do so, the reader's browser extension must be able to send money to you, so you need to run a server-side LedgerLoops agent.

So in the other window, run `node ./agent.js` to run a server that will open a WebSocket servers, with your Agent sitting behind.

Currently, the WebSockets don't reconnect, and don't retry to connect, so after you started the server-side script, you should refresh the page in your browser. That way, the browser extensions will try again to connect to your Agent server.

Note that the server-side script requires the ledgerloops package (which it includes from `'../..'`, but in your application you would just require it from npm), and also that it requiresa the `'ws'` package for the WebSocket servers, so make sure that you ran `npm install` in the repo root.
