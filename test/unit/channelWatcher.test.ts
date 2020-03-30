import { ChannelWatcher } from "../../src/channelWatcher";

describe("ChannelWatcher", () => {
  let channelWatcher: ChannelWatcher;
  beforeEach(function() {
    // function ChannelWatcher (peerNick, myNick, unit, handler, medium) {
    channelWatcher = new ChannelWatcher(0, 0); //, {}, { addChannel: () => {} })
  });
  describe("ChannelWatcher#setOurTrust", () => {
    it.skip("should exist", () => {
      expect(typeof channelWatcher.setOurTrust).toEqual("function");
    });
  });
});
