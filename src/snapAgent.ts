import { FullLedger } from "./fullLedger";
import { StateTransition } from "./halfLedger";

export type SnapMessageLogEntry = {
  stateTransition: StateTransition;
  unit: string;
  from: string;
  to: string;
  time: Date;
};
export class SnapAgent {
  agentName: string;
  msgLog: SnapMessageLogEntry[];
  ledgers: {
    [peerName: string]: {
      [unit: string]: FullLedger;
    };
  };
  constructor(agentName: string) {
    this.agentName = agentName;
    this.msgLog = [];
    this.ledgers = {};
  }
  getLedger(peerName: string, unit: string) {
    if (!this.ledgers[peerName]) {
      this.ledgers[peerName] = {};
    }
    if (!this.ledgers[peerName][unit]) {
      this.ledgers[peerName][unit] = new FullLedger(0, 0);
    }
    return this.ledgers[peerName][unit];
  }
  logMessage(msg: SnapMessageLogEntry) {
    this.msgLog.push(msg);
    let peerName;
    if (msg.from === this.agentName) {
      peerName = msg.to;
    } else if (msg.to === this.agentName) {
      peerName = msg.from;
    } else {
      return;
    }
    const ledger = this.getLedger(peerName, msg.unit);
    if (msg.from === this.agentName) {
      ledger.handleMessageWeSend(msg.stateTransition, msg.time);
    } else if (msg.to === this.agentName) {
      ledger.handleMessageWeReceive(msg.stateTransition, msg.time);
    }
  }
}
