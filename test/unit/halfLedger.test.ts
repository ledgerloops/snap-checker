import { HalfLedger, SnapTransactionState } from "../../src/halfLedger";

describe("HalfLedger", () => {
  let halfLedger = new HalfLedger(100);

  it("handles an unconditional transaction", () => {
    halfLedger.handleProposerMessage({
      newState: SnapTransactionState.Proposing,
      transId: 0,
      amount: 10
    });
    expect(halfLedger.getSum(true)).toEqual(10);
  });
});
