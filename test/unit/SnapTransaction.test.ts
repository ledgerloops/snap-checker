import {
  SnapTransactionState,
  snapTransactionStateToString,
  checkStateTransitionIsValid
} from "../../src/SnapTransaction";

describe("snapTransactionStateToString", () => {
  it("gives the expected string for each state", () => {
    [
      "Proposing",
      "Proposed",
      "Accepting",
      "Accepted",
      "Rejecting",
      "Rejected"
    ].forEach((str: string) => {
      expect(snapTransactionStateToString(SnapTransactionState[str])).toEqual(
        `[${str}]`
      );
    });
  });
});

describe("checkStateTransitionIsValid", () => {
  it("requires amount on Proposing", () => {
    expect(() => {
      checkStateTransitionIsValid({
        transId: 1,
        newState: SnapTransactionState.Proposing
      });
    }).toThrow();
  });
  it("disallows preimage on Proposing", () => {
    expect(() => {
      checkStateTransitionIsValid({
        transId: 1,
        newState: SnapTransactionState.Proposing,
        amount: 10,
        preimage: "asdf"
      });
    }).toThrow();
  });
});
