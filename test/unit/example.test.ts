import { Example } from "../../src/example";

describe("Example", () => {
  it("runs", () => {
    const example = new Example();
    example.runExample();
    expect(example.alice.getLedger("bob", "10E-3 USD").getOurCurrent()).toEqual(
      -10
    );
  });
});
