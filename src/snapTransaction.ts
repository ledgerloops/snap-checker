export enum SnapTransactionState {
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

export type StateTransition = {
  transId: number;
  newState: SnapTransactionState;
  amount?: number;
  condition?: string;
  preimage?: string;
  expiresAt?: Date;
};

export type Transaction = {
  amount: number;
  condition?: string;
  expiresAt?: Date;
};
