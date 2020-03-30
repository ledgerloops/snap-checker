export enum SnapTransactionState {
  Proposing,
  Proposed,
  Accepting,
  Accepted,
  Rejecting,
  Rejected
}

function snapTransactionStateToString(
  snapTransactionState: SnapTransactionState
): string {
  const names = {
    [SnapTransactionState.Proposing]: "[Proposing]",
    [SnapTransactionState.Proposed]: "[Proposed]",
    [SnapTransactionState.Accepting]: "[Accepting]",
    [SnapTransactionState.Accepted]: "[Accepted]",
    [SnapTransactionState.Rejecting]: "[Rejecting]",
    [SnapTransactionState.Rejected]: "[Rejected]"
  };
  return names[snapTransactionState];
}

export function checkStateTransitionIsValid(msg: StateTransition): void {
  // Note that transId and newState are also required at the TypeScript level.
  const requiredFields = {
    [SnapTransactionState.Proposing]: ["amount"]
  };
  requiredFields[msg.newState]?.forEach((requiredField: string) => {
    if (typeof msg[requiredField] === "undefined") {
      throw new Error(
        `If msg.newState is ${snapTransactionStateToString(
          msg.newState
        )} then ${requiredField} is required.`
      );
    }
  });

  const disallowedFields = {
    [SnapTransactionState.Proposing]: ["preimage"],
    [SnapTransactionState.Proposed]: [
      "amount",
      "condition",
      "expiresAt",
      "preimage"
    ],
    [SnapTransactionState.Accepting]: ["amount", "condition", "expiresAt"],
    [SnapTransactionState.Accepted]: [
      "amount",
      "condition",
      "expiresAt",
      "preimage"
    ],
    [SnapTransactionState.Rejecting]: [
      "amount",
      "condition",
      "expiresAt",
      "preimage"
    ],
    [SnapTransactionState.Rejected]: [
      "amount",
      "condition",
      "expiresAt",
      "preimage"
    ]
  };
  disallowedFields[msg.newState]?.forEach((disallowedField: string) => {
    if (typeof msg[disallowedField] !== "undefined") {
      throw new Error(
        `If msg.newState is ${snapTransactionStateToString(
          msg.newState
        )} then ${disallowedField} is disallowed.`
      );
    }
  });
}

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
