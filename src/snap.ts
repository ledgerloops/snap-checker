// import { EventEmitter2 } from 'eventemitter2'

export type SendMsgFun = (msg: string) => Promise<void>;
export type HandleProposalFun = (propsal: Transaction) => Promise<Decision>;

export type Transaction = {
  amount: number;
  condition?: string;
  timeout?: Date;
};

export type Decision = {
  accepted: boolean;
  preimage?: string;
};

export type HalfBalances = {
  current: number;
  payable: number;
  receivable: number;
};

export type Balances = {
  us: HalfBalances;
  them: HalfBalances;
};

export class Snap /* extends EventEmitter2 */ {
  sendMsg: SendMsgFun;
  handleProposal: HandleProposalFun;
  constructor(sendMsg: SendMsgFun, handleProposal: HandleProposalFun) {
    // super();
    this.sendMsg = sendMsg;
    this.handleProposal = handleProposal;
  }
  propose(trans: Transaction): number {
    return 0;
  }
  getBalances(): Balances {
    return {
      us: {
        current: 0,
        payable: 0,
        receivable: 0
      },
      them: {
        current: 0,
        payable: 0,
        receivable: 0
      }
    };
  }
}
