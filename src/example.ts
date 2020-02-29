import { sha256 } from "hashlocks";
import { SnapAgent, SnapMessageLogEntry } from "./snapAgent";
import { SnapTransactionState, StateTransition } from "./halfLedger";

const preimage: string = "bla";
const condition: string = sha256(preimage);

export class Example {
  alice: SnapAgent;
  bob: SnapAgent;
  delay: number;
  unit: string;
  constructor() {
    this.alice = new SnapAgent("alice");
    this.alice.getLedger("bob", "10E-3 USD").setTheirTrust(100);
    this.bob = new SnapAgent("bob");
    this.bob.getLedger("alice", "10E-3 USD").setOurTrust(100);
    this.delay = 100; // ms
    this.unit = "10E-3 USD";
  }
  simulateMessage(stateTransition: StateTransition, from: string, to: string) {
    const msNow = new Date().getTime();
    this[from].logMessage({
      time: new Date(msNow),
      from,
      to,
      unit: this.unit,
      stateTransition
    });
    this[to].logMessage({
      time: new Date(msNow + this.delay),
      from,
      to,
      unit: this.unit,
      stateTransition
    });
  }
  simulateProposing(amount: number, condition?: string, expiresAt?: Date) {
    const msg: SnapMessageLogEntry = {
      stateTransition: {
        transId: 0,
        newState: SnapTransactionState.Proposing,
        amount,
        condition,
        expiresAt
      },
      unit: "10E-3 USD",
      from: "alice",
      to: "bob",
      time: new Date()
    };
    this.alice.logMessage(msg);
    this.bob.logMessage(msg);
  }
  simulateProposed() {
    const stateTransition: StateTransition = {
      transId: 0,
      newState: SnapTransactionState.Proposed
    };
    this.simulateMessage(stateTransition, "bob", "alice");
  }
  simulateAccepting() {
    const stateTransition: StateTransition = {
      transId: 0,
      newState: SnapTransactionState.Accepting
    };
    this.simulateMessage(stateTransition, "bob", "alice");
  }
  simulateAccepted() {
    const stateTransition: StateTransition = {
      transId: 0,
      newState: SnapTransactionState.Accepted
    };
    this.simulateMessage(stateTransition, "alice", "bob");
  }
  runExample() {
    this.simulateProposing(10, condition);
    this.simulateProposed();
    this.simulateAccepting();
    this.simulateAccepted();
  }
}
