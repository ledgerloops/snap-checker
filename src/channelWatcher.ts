import { SimplexWatcher } from "./simplexWatcher";
import { SnapTransactionState, StateTransition } from "./SnapTransaction";

const proposerMessageTypes = [
  SnapTransactionState.Proposing,
  SnapTransactionState.Accepted,
  SnapTransactionState.Rejected
];

export class ChannelWatcher {
  us: SimplexWatcher;
  them: SimplexWatcher;
  ourTrust: number;
  theirTrust: number;
  constructor(ourStart: number, theirStart: number) {
    this.us = new SimplexWatcher(ourStart);
    this.them = new SimplexWatcher(theirStart);
  }
  setOurTrust(value: number): void {
    this.ourTrust = value;
    this.updateTheirMax();
  }
  updateTheirMax(): void {
    const ourTotal = this.us.getSum(false);
    // console.log("updateTheirMax", this.ourTrust, ourTotal);
    return this.them.setMax(this.ourTrust + ourTotal);
  }
  setTheirTrust(value: number): void {
    this.theirTrust = value;
    this.updateOurMax();
  }
  updateOurMax(): void {
    const theirTotal = this.us.getSum(false);
    // console.log("updateOurMax", this.theirTrust, theirTotal);
    return this.us.setMax(this.theirTrust + theirTotal);
  }
  getOurCurrent(): number {
    const ourReceived = this.them.getSum(false);
    const ourUsed = this.us.getSum(true);
    return ourReceived - ourUsed;
  }
  getTheirCurrent(): number {
    const theirReceived = this.us.getSum(false);
    const theirUsed = this.them.getSum(true);
    return theirReceived - theirUsed;
  }
  getOurPayable(): number {
    return this.us.getSum(true, false);
  }
  getTheirPayable(): number {
    return this.them.getSum(true, false);
  }
  getOurReceivable(): number {
    return this.getTheirPayable();
  }
  getTheirReceivable(): number {
    return this.getOurPayable();
  }
  handleMessageWeSend(stateTransition: StateTransition, time: Date): void {
    const proposerMessageTypes = [
      SnapTransactionState.Proposing,
      SnapTransactionState.Accepted,
      SnapTransactionState.Rejected
    ];
    if (proposerMessageTypes.indexOf(stateTransition.newState) !== -1) {
      return this.us.handleProposerMessage(stateTransition, time);
    } else {
      const ret = this.them.handleDeciderMessage(stateTransition, time);
      if (stateTransition.newState === SnapTransactionState.Accepted) {
        this.updateOurMax();
      }
      return ret;
    }
  }
  handleMessageWeReceive(stateTransition: StateTransition, time: Date): void {
    if (proposerMessageTypes.indexOf(stateTransition.newState) !== -1) {
      return this.them.handleProposerMessage(stateTransition, time);
    } else {
      const ret = this.us.handleDeciderMessage(stateTransition, time);
      if (stateTransition.newState === SnapTransactionState.Accepted) {
        this.updateTheirMax();
      }
      return ret;
    }
  }
}
