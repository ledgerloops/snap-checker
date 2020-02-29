import {
  HalfLedger,
  SnapTransactionState,
  StateTransition
} from "./halfLedger";

export class Snap {
  us: HalfLedger;
  them: HalfLedger;
  constructor() {
    this.us = new HalfLedger();
    this.them = new HalfLedger();
  }
  handleIncoming(msg: StateTransition) {
    switch (msg.newState) {
      case SnapTransactionState.Proposing:
      case SnapTransactionState.Accepted:
      case SnapTransactionState.Rejected:
        this.them.handleProposerMessage(msg);
        break;
      case SnapTransactionState.Proposed:
      case SnapTransactionState.Accepting:
      case SnapTransactionState.Rejecting:
        this.us.handleDeciderMessage(msg);
        break;
      default:
    }
  }
  handleOutgoing(msg: StateTransition) {
    switch (msg.newState) {
      case SnapTransactionState.Proposing:
      case SnapTransactionState.Accepted:
      case SnapTransactionState.Rejected:
        this.us.handleProposerMessage(msg);
        break;
      case SnapTransactionState.Proposed:
      case SnapTransactionState.Accepting:
      case SnapTransactionState.Rejecting:
        this.them.handleDeciderMessage(msg);
        break;
      default:
    }
  }
  // getBalances(): Balances {
  //   return {
  //     us: {
  //       current: this.them.getSum(false) - this.us.getSum(false),
  //       payable: 0,
  //       receivable: 0
  //     },
  //     them: {
  //       current: this.us.getSum(false) - this.them.getSum(false),
  //       payable: 0,
  //       receivable: 0
  //     }
  //   };
  // }
}
