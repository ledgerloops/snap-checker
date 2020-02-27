import { Ledger } from "../../src/ledger";

describe("Ledger", () => {
  beforeEach(function() {
    // function Ledger (peerNick, myNick, unit, handler, medium) {
    this.ledger = new Ledger("Bob", "Alice", "UCR"); //, {}, { addChannel: () => {} })
  });
  describe("Ledger#create", () => {
    it("should exist", () => {
      expect(typeof this.ledger.create).toEqual("function");
    });
  });
});
