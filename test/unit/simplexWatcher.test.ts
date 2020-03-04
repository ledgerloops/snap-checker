import { SimplexWatcher } from "../../src/SimplexWatcher";
import { SnapTransactionState } from "../../src/snapTransaction";

describe("SimplexWatcher", () => {
  const simplexWatcher = new SimplexWatcher(0, 100);

  it("handles an unconditional transaction", () => {
    simplexWatcher.handleProposerMessage(
      {
        newState: SnapTransactionState.Proposing,
        transId: 0,
        amount: 10
      },
      new Date()
    );
    expect(simplexWatcher.getSum(true)).toEqual(10);
  });
});
