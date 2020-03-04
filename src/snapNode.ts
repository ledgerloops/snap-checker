import { ChannelWatcher } from "./channelWatcher";
import { StateTransition } from "./snapTransaction";

export type SnapMessageLogEntry = {
  stateTransition: StateTransition;
  time: Date;
  from: string;
  to: string;
  unit: string;
};

export class SnapNode {
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

  getChannelWatcher(
    agentName: string,
    peerName: string,
    unit: string
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
        0,
        0
      );
    }
    return this.channelWatchers[agentName][peerName][unit];
  }

  isLocal(agentName: string): boolean {
    return typeof this.channelWatchers[agentName] !== undefined;
  }

  logMessage(msg: SnapMessageLogEntry): void {
    this.msgLog.push(msg);
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
}
