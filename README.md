# LedgerLoops

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

Examples:

* in-browser: shows a graph of friends, you can tell friends to give each other money, and they will cooperate to find and resolve ledger loops. See the README in that folder for instructions.
* client-server: example where Marsellus lives server-side, while Mia and Vincent live client-side. Shows and tests how WebSockets are used. See the README in that folder for instructions.
* monetized-blog: static page, combined with a WebSocket server, that will accrue money when a user with the LedgerLoops browser extension visits this page. This demo is still under construction. See https://github.com/ledgerloops/ledgerloops/issues/21.
* monetized-blog-heroku: Same as the previous demo, but running on Heroku instead of on localhost, and with the statics server rolled into the LedgerLoops agent server.
