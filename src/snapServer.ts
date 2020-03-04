import { ChannelWatcher } from "./channelWatcher";
import { StateTransition } from "./snapTransaction";

export type SnapMessageLogEntry = {
  stateTransition?: StateTransition;
  newTrustLevel?: number;
  time: Date;
  from: string;
  to: string;
  unit: string;
};

export class SnapServer {
  msgLog: SnapMessageLogEntry[];
  channelWatchers: {
    [agentName: string]: {
      [peerName: string]: {
        [unit: string]: ChannelWatcher;
      };
    };
  };

  constructor(locals: string[]) {
    this.msgLog = [];
    this.channelWatchers = {};
    locals.forEach(agentName => {
      this.channelWatchers[agentName] = {};
    });
  }

  private getChannelWatcher(
    agentName: string,
    peerName: string,
    unit: string,
    agentStart: number = 0,
    peerStart: number = 0
  ): ChannelWatcher {
    if (!this.channelWatchers[agentName]) {
      // this.channelWatchers[agentName] = {};
      throw new Error("Agent not local! " + agentName);
    }
    if (!this.channelWatchers[agentName][peerName]) {
      this.channelWatchers[agentName][peerName] = {};
    }
    if (!this.channelWatchers[agentName][peerName][unit]) {
      this.channelWatchers[agentName][peerName][unit] = new ChannelWatcher(
        agentStart,
        peerStart
      );
    }
    return this.channelWatchers[agentName][peerName][unit];
  }

  private isLocal(agentName: string): boolean {
    return typeof this.channelWatchers[agentName] !== "undefined";
  }
  getBalances(agentName: string, peerName: string, unit: string) {
    const channelWatcher = this.getChannelWatcher(agentName, peerName, unit);
    return {
      current: channelWatcher.getOurCurrent(),
      payable: channelWatcher.getOurPayable(),
      receivable: channelWatcher.getOurReceivable()
    };
  }
  setStartBalance(
    agentName: string,
    peerName: string,
    unit: string,
    agentStart: number,
    peerStart: number
  ) {
    this.getChannelWatcher(agentName, peerName, unit, agentStart, peerStart);
  }
  private processTrustChange(msg: SnapMessageLogEntry) {
    if (this.isLocal(msg.from)) {
      this.getChannelWatcher(msg.from, msg.to, msg.unit).setOurTrust(
        msg.newTrustLevel
      );
    }
    if (this.isLocal(msg.to)) {
      this.getChannelWatcher(msg.to, msg.from, msg.unit).setTheirTrust(
        msg.newTrustLevel
      );
    }
  }
  private processSnapMessage(msg: SnapMessageLogEntry): void {
    if (this.isLocal(msg.from)) {
      this.getChannelWatcher(msg.from, msg.to, msg.unit).handleMessageWeSend(
        msg.stateTransition,
        msg.time
      );
    }
    if (this.isLocal(msg.to)) {
      this.getChannelWatcher(msg.to, msg.from, msg.unit).handleMessageWeReceive(
        msg.stateTransition,
        msg.time
      );
    }
  }
  logMessage(msg: SnapMessageLogEntry): void {
    if (
      this.msgLog.length &&
      msg.time < this.msgLog[this.msgLog.length - 1].time
    ) {
      throw new Error("Please log messages in chronological order");
    }
    this.msgLog.push(msg);
    if (msg.stateTransition) {
      return this.processSnapMessage(msg);
    }
    if (msg.newTrustLevel) {
      return this.processTrustChange(msg);
    }
  }
}
