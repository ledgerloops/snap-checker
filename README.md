# LedgerLoops

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

Examples:

* in-browser: shows a graph of friends, you can tell friends to give each other money, and they will cooperate to find and resolve ledger loops. See the README in that folder for instructions.
* client-server: example where Marsellus lives server-side, while Mia and Vincent live client-side. Shows and tests how WebSockets are used. See the README in that folder for instructions.
* monetized-blog: static page, combined with a WebSocket server, that will accrue money when a user with the LedgerLoops browser extension visits this page. This demo is still under construction. See https://github.com/ledgerloops/ledgerloops/issues/21.
* monetized-blog-heroku: Same as the previous demo, but running on Heroku instead of on localhost, and with the statics server rolled into the LedgerLoops agent server.

* API

* LedgerLoops.Agent constructor (myName, mySecret, credsHandler)
  * myName and mySecret are used when connecting to a server
  * credsHandler `({ peerName, peerSecret}) => Boolean` is called when someone else connects as a client

* Agent#addClient: function(options) {
    return this.hubbie.addClient(Object.assign({
      myName: this._myName,
      mySecret: this._mySecret,
      protocols: [ LEDGERLOOPS_PROTOCOL_VERSION ]
    }, options));
  }

* Agent#listen: function (options) {
    return this.hubbie.listen(Object.assign({
      protocolName: LEDGERLOOPS_PROTOCOL_VERSION
    }, options));
  }

* Agent#addTransaction: function (peerName, amount)
    return this._propose(peerName, amount);
  }

* Agent#getBalance ()
  * returns a hash with the bank's current, payable, receivable balances.

# * Agent#payIntoNetwork(peerName, value)
#   * instruct the Loops engine to use your balance from the account with that peer to pay into the network
# 
# * Agent#receiveFromNetwork(peerName, value)
#   * instruct the Loops engine to use the account with that peer to receive balance from the network

Messages and their fields when on the wire:

* ADD
  * protocol: 'ledgerloops-0.8'
  * msgType: 'ADD'
  * msgId: integer
  * beneficiary: 'you' or 'me'
  * amount: integer
  * unit: 'UCR'
  * note: String (optional)

* ACK
  * protocol: 'ledgerloops-0.8'
  * msgType: 'ACK'
  * msgId: integer

* REJECT
  * protocol: 'ledgerloops-0.8'
  * msgType: 'REJECT'
  * msgId: integer
  * reason: String (optional)

* COND
  * protocol: 'ledgerloops-0.8'
  * msgType: 'COND'
  * msgId: integer
  * condition: <256 bits in a lower-case hex string>
  * beneficiary: 'you' or 'me'
  * amount: integer
  * unit: 'UCR'
  * routeId: String (from probes)
  * note: String (optional)

* FULFILL
  * protocol: 'ledgerloops-0.8'
  * msgType: 'FULFILL'
  * msgId: integer
  * preimage: <256 bits in lower-case hex format>

* PLEASE-FINALIZE
  * protocol: 'ledgerloops-0.8'
  * msgType: 'PLEASE-FINALIZE'
  * msgId: integer

* PROBES
  * protocol: 'ledgerloops-0.8'
  * msgType: 'PROBES'
  * cwise: Array of 64-bit lower-case hex strings
  * fwise: Array of 64-bit lower-case hex strings
