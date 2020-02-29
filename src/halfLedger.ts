function hash(str: string) {
  return `hash-of-${str}`;
}
function expired(expiresAt: Date) {
  return false;
}

export enum SnapMessageType {
  Proposing,
  Proposed,
  Accepting,
  Accepted,
  Rejecting,
  Rejected
}

// VALID combinations:
// msgId, msgType=Proposing, amount, unit.
// msgId, msgType=Proposing, amount, unit, condition.
// msgId, msgType=Proposing, amount, unit, expiresAt.
// msgId, msgType=Proposing, amount, unit, condition, expiresAt.
// msgId, msgType=Proposed.

// msgId, msgType=Accepting. (if the Propose did not have a condition).
// msgId, msgType=Accepting, preimage. (if the Propose did have a condition).
// msgId, msgType=Accepted.

// msgId, msgType=Rejecting.
// msgId, msgType=Rejected.

export type SnapMessage = {
  msgId: number;
  msgType: SnapMessageType;
  amount?: number;
  unit?: string;
  condition?: string;
  preimage?: string;
  expiresAt?: Date;
};

export type Transaction = {
  amount: number;
  unit: string;
  condition?: string;
  expiresAt?: Date;
};

export type LedgerEntry = {
  status: SnapMessageType;
  trans: Transaction;
};

export class HalfLedger {
  entries: LedgerEntry[];
  max: number;
  unit: string;
  constructor(unit: string, max = 0) {
    this.unit = unit;
    this.max = max;
    this.entries = [];
  }
  handleProposerMessage(msg: SnapMessage) {
    switch (msg.msgType) {
      case SnapMessageType.Proposing:
        if (this.entries[msg.msgId] === undefined) {
          // CHECK 1: only add a new proposal if it doesn't bring the total over max.
          if (msg.amount + this.getSum(true) > this.max) {
            throw new Error("Amount would bring total over max");
          }
          // CHECK 2: only deal with one unit
          if (msg.unit !== this.unit) {
            throw new Error("wrong unit!");
          }
          const trans: Transaction = {
            amount: msg.amount,
            unit: msg.unit
          };
          if (msg.condition) {
            trans.condition = msg.condition;
          }
          if (msg.expiresAt) {
            trans.expiresAt = msg.expiresAt;
          }
          this.entries[msg.msgId] = {
            status: msg.msgType,
            trans
          };
        }
        break;
      case SnapMessageType.Accepted:
        if (
          this.entries[msg.msgId] !== undefined &&
          this.entries[msg.msgId].status === SnapMessageType.Accepting
        ) {
          this.entries[msg.msgId].status = SnapMessageType.Accepted;
        }
        break;
      case SnapMessageType.Rejected:
        if (
          this.entries[msg.msgId] !== undefined &&
          this.entries[msg.msgId].status === SnapMessageType.Rejecting
        ) {
          this.entries[msg.msgId].status = SnapMessageType.Rejected;
        }
        break;
    }
  }
  handleDeciderMessage(msg: SnapMessage) {
    switch (msg.msgType) {
      case SnapMessageType.Proposed:
        if (
          this.entries[msg.msgId] !== undefined &&
          this.entries[msg.msgId].status === SnapMessageType.Proposing
        ) {
          this.entries[msg.msgId].status = SnapMessageType.Proposed;
        }
        break;
      case SnapMessageType.Accepting:
        if (
          this.entries[msg.msgId] !== undefined &&
          (this.entries[msg.msgId].status === SnapMessageType.Proposing ||
            this.entries[msg.msgId].status === SnapMessageType.Proposed)
        ) {
          // CHECK 3: only commit an accept of a conditional transaction if the preimage is given correctly
          if (
            this.entries[msg.msgId].trans.condition &&
            hash(msg.preimage) !== this.entries[msg.msgId].trans.condition
          ) {
            return;
          }
          // CHECK 4: only commit a transaction with expiresAt if that time hasn't passed yet
          if (
            this.entries[msg.msgId].trans.expiresAt &&
            expired(this.entries[msg.msgId].trans.expiresAt)
          ) {
            return;
          }
          this.entries[msg.msgId].status = SnapMessageType.Accepting;
        }
        break;
      case SnapMessageType.Rejecting:
        if (
          this.entries[msg.msgId] !== undefined &&
          (this.entries[msg.msgId].status === SnapMessageType.Proposing ||
            this.entries[msg.msgId].status === SnapMessageType.Proposed)
        ) {
          this.entries[msg.msgId].status = SnapMessageType.Accepting;
        }
        break;
    }
  }
  getSum(
    includePending: boolean,
    includeAccepted: boolean = true,
    includeRejected: boolean = false
  ) {
    const statusAccepted = SnapMessageType.Accepted;
    const statusesPending = [
      SnapMessageType.Proposing,
      SnapMessageType.Proposed,
      SnapMessageType.Rejecting,
      SnapMessageType.Accepting
    ];
    const statusRejected = SnapMessageType.Rejected;

    let total = 0;
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
}
