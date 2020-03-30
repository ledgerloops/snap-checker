import { StateTransition, SnapTransactionState } from "../../src/";

describe("StateTransition, SnapTransactionState", () => {
  it("exists", async () => {
    const msg: StateTransition = {
      transId: 1,
      newState: SnapTransactionState.Accepted
    };
    expect(msg).toBeTruthy();
  });
});
