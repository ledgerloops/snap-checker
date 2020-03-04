import { sha256 } from "hashlocks";
import { SnapNode } from "./snapNode";
import { SnapTransactionState, StateTransition } from "./snapTransaction";

const preimage = "bla";
const condition: string = sha256(preimage);

export class Example {
  redNode: SnapNode;
  blueNode: SnapNode;
  delay: number;
  unit: string;
  constructor() {
    this.redNode = new SnapNode(["alice"]);
    this.redNode
      .getChannelWatcher("alice", "bob", "10E-3 USD")
      .setTheirTrust(100);
    this.blueNode = new SnapNode(["bob"]);
    this.blueNode
      .getChannelWatcher("bob", "alice", "10E-3 USD")
      .setOurTrust(100);
    this.delay = 100; // ms
    this.unit = "10E-3 USD";
  }
  simulateMessage(
    stateTransition: StateTransition,
    fromNode: string,
    toNode: string,
    from: string,
    to: string
  ) {
    const msNow = new Date().getTime();
    this[fromNode].logMessage({
      time: new Date(msNow),
      from,
      to,
      unit: this.unit,
      stateTransition
    });
    this[toNode].logMessage({
      time: new Date(msNow + this.delay),
      from,
      to,
      unit: this.unit,
      stateTransition
    });
  }
  simulateProposing(amount: number, condition?: string, expiresAt?: Date) {
    this.simulateMessage(
      {
        transId: 0,
        newState: SnapTransactionState.Proposing,
        amount,
        condition,
        expiresAt
      },
      "redNode",
      "blueNode",
      "alice",
      "bob"
    );
  }
  simulateProposed() {
    const stateTransition: StateTransition = {
      transId: 0,
      newState: SnapTransactionState.Proposed
    };
    this.simulateMessage(
      stateTransition,
      "blueNode",
      "redNode",
      "bob",
      "alice"
    );
  }
  simulateAccepting() {
    const stateTransition: StateTransition = {
      transId: 0,
      newState: SnapTransactionState.Accepting
    };
    this.simulateMessage(
      stateTransition,
      "redNode",
      "blueNode",
      "alice",
      "bob"
    );
  }
  simulateAccepted() {
    const stateTransition: StateTransition = {
      transId: 0,
      newState: SnapTransactionState.Accepted
    };
    this.simulateMessage(
      stateTransition,
      "blueNode",
      "redNode",
      "alice",
      "bob"
    );
  }
  runExample() {
    this.simulateProposing(10, condition);
    this.simulateProposed();
    this.simulateAccepting();
    this.simulateAccepted();
  }
}
