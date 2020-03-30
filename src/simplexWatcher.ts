import { sha256 } from "hashlocks";
import {
  SnapTransactionState,
  Transaction,
  StateTransition,
  checkStateTransitionIsValid
} from "./SnapTransaction";

function expired(expiresAt: Date, sentAt: Date): boolean {
  return expiresAt > sentAt;
}

export type LedgerEntry = {
  status: SnapTransactionState;
  trans: Transaction;
  time: Date;
};

export class SimplexWatcher {
  entries: LedgerEntry[];
  start: number;
  max: number;
  constructor(start = 0, max = 0) {
    this.start = start;
    this.max = max;
    this.entries = [];
  }
  handleProposerMessage(msg: StateTransition, time: Date): void {
    checkStateTransitionIsValid(msg);
    switch (msg.newState) {
      case SnapTransactionState.Proposing:
        if (this.entries[msg.transId] === undefined) {
          // CHECK 1: only add a new proposal if it doesn't bring the total over max.
          if ((msg.amount as number) + this.getSum(true) > this.max) {
            console.log(msg, this);
            throw new Error("Amount would bring total over max");
          }
          const trans: Transaction = {
            amount: msg.amount as number
          };
          if (msg.condition) {
            trans.condition = msg.condition;
          }
          if (msg.expiresAt) {
            trans.expiresAt = msg.expiresAt;
          }
          this.entries[msg.transId] = {
            status: msg.newState,
            trans,
            time
          };
        }
        break;
      case SnapTransactionState.Accepted:
        if (
          this.entries[msg.transId] !== undefined &&
          this.entries[msg.transId].status === SnapTransactionState.Accepting
        ) {
          this.entries[msg.transId].status = SnapTransactionState.Accepted;
        }
        break;
      case SnapTransactionState.Rejected:
        if (
          this.entries[msg.transId] !== undefined &&
          this.entries[msg.transId].status === SnapTransactionState.Rejecting
        ) {
          this.entries[msg.transId].status = SnapTransactionState.Rejected;
        }
        break;
    }
  }
  handleDeciderMessage(msg: StateTransition, time: Date): void {
    switch (msg.newState) {
      case SnapTransactionState.Proposed:
        if (
          this.entries[msg.transId] !== undefined &&
          this.entries[msg.transId].status === SnapTransactionState.Proposing
        ) {
          this.entries[msg.transId].status = SnapTransactionState.Proposed;
        }
        break;
      case SnapTransactionState.Accepting:
        if (
          this.entries[msg.transId] !== undefined &&
          (this.entries[msg.transId].status ===
            SnapTransactionState.Proposing ||
            this.entries[msg.transId].status === SnapTransactionState.Proposed)
        ) {
          // CHECK 2: only commit an accept of a conditional transaction if the preimage is given correctly
          if (
            this.entries[msg.transId].trans.condition &&
            sha256(msg.preimage) !== this.entries[msg.transId].trans.condition
          ) {
            return;
          }
          // CHECK 3: only commit a transaction with expiresAt if that time hasn't passed yet
          if (
            this.entries[msg.transId].trans.expiresAt &&
            expired(this.entries[msg.transId].trans.expiresAt as Date, time)
          ) {
            return;
          }
          this.entries[msg.transId].status = SnapTransactionState.Accepting;
        }
        break;
      case SnapTransactionState.Rejecting:
        if (
          this.entries[msg.transId] !== undefined &&
          (this.entries[msg.transId].status ===
            SnapTransactionState.Proposing ||
            this.entries[msg.transId].status === SnapTransactionState.Proposed)
        ) {
          this.entries[msg.transId].status = SnapTransactionState.Accepting;
        }
        break;
    }
  }
  getSum(
    includePending: boolean,
    includeAccepted = true,
    includeRejected = false
  ): number {
    const statusAccepted = SnapTransactionState.Accepted;
    const statusesPending = [
      SnapTransactionState.Proposing,
      SnapTransactionState.Proposed,
      SnapTransactionState.Rejecting,
      SnapTransactionState.Accepting
    ];
    const statusRejected = SnapTransactionState.Rejected;

    let total = this.start;
    const entriesToInclude = this.entries.filter(
      (currentEntry: LedgerEntry) => {
        if (includeAccepted && currentEntry.status === statusAccepted) {
          return true;
        }

        if (
          includePending &&
          statusesPending.indexOf(currentEntry.status) !== -1
        ) {
          return true;
        }
        if (includeRejected && currentEntry.status === statusRejected) {
          return true;
        }
      }
    );
    entriesToInclude.forEach((currentEntry: LedgerEntry) => {
      total += currentEntry.trans.amount;
    });
    return total;
  }
  setMax(value: number): void {
    // console.log("setting max", value);
    this.max = value;
  }
}
