import { Example } from "../../examples";

describe("Example", () => {
  it("runs", () => {
    const example = new Example();
    example.runExample();
    expect(example.redNode.getBalances("alice", "bob", "10E-3 USD")).toEqual({
      current: -10
    });
  });
});
