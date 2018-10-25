# Synchronized Network Accounting Protocol (SNAP)

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)
[![Tests](https://api.travis-ci.org/ledgerloops/snap.svg?branch=master)](https://travis-ci.org/ledgerloops/snap)

This is an implementation of [SNAP](protocol.md) based on [Hubbie](https://github.com/ledgerloops/hubbie) for messaging, and including [LedgerLoops](https://github.com/ledgerloops/ledgerloops) for cycle detection.

NPM package: [networkledger](https://www.npmjs.com/package/networkledger)

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

### Network Ledger Messages
The following set of messages is an evolution of the Synchronized Network Accounting Protocol (SNAP), as originally invented by my colleague Bob Way at Ripple.

* PROPOSE (request)
  * msgType: 'PROPOSE'
  * msgId: integer
  * condition: <256 bits in a lower-case hex string> (optional)
  * beneficiary: 'you' or 'me'
  * amount: integer
  * unit: 'UCR'
  * routeId: String (optional)
  * note: String (optional)

PROPOSE requests can be resent idempotently until a response is received:

* ACCEPT (response)
  * msgType: 'ACCEPT'
  * msgId: integer
  * preimage: <256 bits in lower-case hex format> (if the request had a condition)

* REJECT (response)
  * msgType: 'REJECT'
  * msgId: integer
  * reason: String (optional)

The receiver decides whether the sender's proposal gets accepted onto the ledger or not.
These messages can be sent on a bi-directional messaging channel. Both parties have three balances: current, payable, and receivable.
All balances of both parties start at zero. When a proposal is sent, the amount is added to the sender's payable balance, and to the
receiver's receivable balance. When it's accepted the amount is deducted from the sender's payable and current balances. For the receiver,
the amount is moved from receivable to current. If a proposal is rejected, the money is just deducted from sender's payable and from
receiver's receivable, without affecting their current balances. The two current balances always add up to zero. And one party's payable
balance is always equal to the party's receivable balance.
If Bob disappears, Alice would lose at least her own current-payable balance, and at most her own current+receivable balance.
Discrepancies can exist where Bob has marked one of Alice's proposal as accepted or rejected, but the response message doesn't reach Alice successfully. In that case, Alice would repeat her request indefinitely until a valid response from Bob arrives.
Proposals may have negative amounts, meaning they are essentially pull payments instead of regular ledger transfers.

## LedgerLoops control messages

* PLEASE-FINALIZE
  * protocol: 'ledgerloops-0.8'
  * msgType: 'PLEASE-FINALIZE'
  * msgId: integer

* PROBES
  * protocol: 'ledgerloops-0.8'
  * msgType: 'PROBES'
  * cwise: Array of 64-bit lower-case hex strings
  * fwise: Array of 64-bit lower-case hex strings
