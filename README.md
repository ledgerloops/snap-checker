# Synchronized Network Accounting Protocol (SNAP)

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)
[![Tests](https://api.travis-ci.org/ledgerloops/snap.svg?branch=master)](https://travis-ci.org/ledgerloops/snap)

NPM package: [snap-server](https://www.npmjs.com/package/snap-server)

An implementation of the [Synchronized Network Accounting Protocol (SNAP)](http://michielbdejong.com/blog/20.html).

Usage: see [example](https://github.com/ledgerloops/snap/blob/master/examples/basic.ts)

The most basic unit is the Transaction:

```ts
type Transaction = {
  amount: number;
  condition?: string; // 32-byte hex sha256
  expiresAt?: Date;
};
```

Transactions go through state transitions:

```ts
type StateTransition = {
  transId: number;
  newState: SnapTransactionState;
  amount?: number;
  condition?: string;
  preimage?: string;
  expiresAt?: Date;
};
```

Valid combinations:

- Proposer -> Decider: `transId`, `newState=Proposing`, `amount`, `unit`.
- Proposer -> Decider: `transId`, `newState=Proposing`, `amount`, `unit`, `condition`.
- Proposer -> Decider: `transId`, `newState=Proposing`, `amount`, `unit`, `expiresAt`.
- Proposer -> Decider: `transId`, `newState=Proposing`, `amount`, `unit`, `condition`, `expiresAt`.
- Proposer <- Decider: `transId`, `newState=Proposed`.

- Proposer <- Decider: `transId`, `newState=Accepting` (if the Propose did not have a condition).
- Proposer <- Decider: `transId`, `newState=Accepting`, `preimage` (if the Propose did have a condition).
- Proposer -> Decider: `transId`, `newState=Accepted`.

- Proposer <- Decider: `transId`, `newState=Rejecting`.
- Proposer -> Decider: `transId`, `newState=Rejected`.

A `SimplexWatcher` will watch the transactions from one specific proposer to one specific decider in one specific currency.
It can report the sum of all transactions, including/excluding all committed, pending, and rejected transactions, respectively.
It will throw an error if:

- a transaction will make the sum of committed + pending transactions go over the max,
- a transaction is accepted after it has expired, or
- a transaction is accepted without satisfying its condition.

A `ChannelWatcher` combines two `SimplexWatcher`s into a duplex channel. It takes two trust levels and adaptively sets the max of each
`SimplexWatcher` as transactions go back and forth. It can report on current, payable, and receivable balance.

A `SnapServer` combines an append-only message log with one `ChannelWatcher` per combination of (sender, receiver, unit).
It has one public method, `logMessage`, which takes a log entry of the following type:

```ts
type SnapMessageLogEntry = {
  stateTransition: StateTransition;
  time: Date;
  from: string;
  to: string;
  unit: string;
};
```

You can replay a historical message log through a SnapServer and it will arrive at the same combination of balances for each combination of (sender, receiver, unit). FIXME: https://github.com/ledgerloops/snap/issues/65
