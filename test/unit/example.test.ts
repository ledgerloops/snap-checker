import { Example } from "../../src/example";

describe("Example", () => {
  it("runs", () => {
    const example = new Example();
    example.runExample();
    expect(
      example.redNode
        .getChannelWatcher("alice", "bob", "10E-3 USD")
        .getOurCurrent()
    ).toEqual(-10);
  });
});
