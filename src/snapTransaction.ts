export enum SnapTransactionState {
  Proposing,
  Proposed,
  Accepting,
  Accepted,
  Rejecting,
  Rejected
}

// VALID combinations:
// transId, newState=Proposing, amount, unit.
// transId, newState=Proposing, amount, unit, condition.
// transId, newState=Proposing, amount, unit, expiresAt.
// transId, newState=Proposing, amount, unit, condition, expiresAt.
// transId, newState=Proposed.

// transId, newState=Accepting. (if the Propose did not have a condition).
// transId, newState=Accepting, preimage. (if the Propose did have a condition).
// transId, newState=Accepted.

// transId, newState=Rejecting.
// transId, newState=Rejected.

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
