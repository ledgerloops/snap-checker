import { ChannelWatcher } from "../../src/channelWatcher";

describe("ChannelWatcher", () => {
  beforeEach(function() {
    // function ChannelWatcher (peerNick, myNick, unit, handler, medium) {
    this.ChannelWatcher = new ChannelWatcher(0, 0); //, {}, { addChannel: () => {} })
  });
  describe("ChannelWatcher#create", () => {
    it.skip("should exist", () => {
      expect(typeof this.ChannelWatcher.create).toEqual("function");
    });
  });
});
