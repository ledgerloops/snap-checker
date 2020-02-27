import { HalfLedger, SnapMessageType, SnapMessage } from "./halfLedger";

export class Snap {
  us: HalfLedger;
  them: HalfLedger;
  constructor() {
    this.us = new HalfLedger();
    this.them = new HalfLedger();
  }
  handleIncoming(msg: SnapMessage) {
    switch (msg.msgType) {
      case SnapMessageType.Proposing:
      case SnapMessageType.Accepted:
      case SnapMessageType.Rejected:
        this.them.handleProposerMessage(msg);
        break;
      case SnapMessageType.Proposed:
      case SnapMessageType.Accepting:
      case SnapMessageType.Rejecting:
        this.us.handleDeciderMessage(msg);
        break;
      default:
    }
  }
  handleOutgoing(msg: SnapMessage) {
    switch (msg.msgType) {
      case SnapMessageType.Proposing:
      case SnapMessageType.Accepted:
      case SnapMessageType.Rejected:
        this.us.handleProposerMessage(msg);
        break;
      case SnapMessageType.Proposed:
      case SnapMessageType.Accepting:
      case SnapMessageType.Rejecting:
        this.them.handleDeciderMessage(msg);
        break;
      default:
    }
  }
  getBalances(): Balances {
    return {
      us: {
        current: this.them.getSum(false) - this.us.getSum(false),
        payable: 0,
        receivable: 0
      },
      them: {
        current: this.us.getSum(false) - this.them.getSum(false),
        payable: 0,
        receivable: 0
      }
    };
  }
}
