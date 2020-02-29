import { HalfLedger, SnapMessageType } from "../../src/halfLedger";

describe("HalfLedger", () => {
  let halfLedger = new HalfLedger("some unit", 100);

  it("handles an unconditional transaction", () => {
    halfLedger.handleProposerMessage({
      msgType: SnapMessageType.Proposing,
      msgId: 0,
      amount: 10,
      unit: "some unit"
    });
    expect(halfLedger.getSum(true)).toEqual(10);
  });
});
