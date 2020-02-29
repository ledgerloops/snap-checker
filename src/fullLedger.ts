import {
  HalfLedger,
  SnapTransactionState,
  StateTransition
} from "./halfLedger";

const proposerMessageTypes = [
  SnapTransactionState.Proposing,
  SnapTransactionState.Accepted,
  SnapTransactionState.Rejected
];

export class FullLedger {
  us: HalfLedger;
  them: HalfLedger;
  constructor(ourStart: number, theirStart: number) {
    this.us = new HalfLedger(ourStart);
    this.them = new HalfLedger(theirStart);
  }
  setOurTrust(value: number) {
    const ourTotal = this.us.getSum(false);
    return this.them.setMax(value + ourTotal);
  }
  setTheirTrust(value: number) {
    const theirTotal = this.us.getSum(false);
    return this.us.setMax(value + theirTotal);
  }
  getOurCurrent() {
    const ourReceived = this.them.getSum(false);
    const ourUsed = this.us.getSum(true);
    return ourReceived - ourUsed;
  }
  getTheirCurrent() {
    const theirReceived = this.us.getSum(false);
    const theirUsed = this.them.getSum(true);
    return theirReceived - theirUsed;
  }
  getOurPayable() {
    return this.us.getSum(true, false);
  }
  getTheirPayable() {
    return this.them.getSum(true, false);
  }
  getOurReceivable() {
    return this.getTheirPayable();
  }
  getTheirReceivable() {
    return this.getOurPayable();
  }
  handleMessageWeSend(stateTransition: StateTransition, time: Date) {
    const proposerMessageTypes = [
      SnapTransactionState.Proposing,
      SnapTransactionState.Accepted,
      SnapTransactionState.Rejected
    ];
    if (proposerMessageTypes.indexOf(stateTransition.newState) !== -1) {
      return this.us.handleProposerMessage(stateTransition, time);
    } else {
      return this.them.handleDeciderMessage(stateTransition, time);
    }
  }
  handleMessageWeReceive(stateTransition: StateTransition, time: Date) {
    if (proposerMessageTypes.indexOf(stateTransition.newState) !== -1) {
      return this.them.handleProposerMessage(stateTransition, time);
    } else {
      return this.us.handleDeciderMessage(stateTransition, time);
    }
  }
}
