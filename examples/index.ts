import { sha256 } from "hashlocks";
import { SnapServer } from "../src/snapServer";
import { SnapTransactionState, StateTransition } from "../src/snapTransaction";

const preimage = "bla";
const condition: string = sha256(preimage);

export class Example {
  redNode: SnapServer;
  blueNode: SnapServer;
  delay: number;
  unit: string;
  constructor() {
    this.delay = 100; // ms
    this.unit = "10E-3 USD";

    this.redNode = new SnapServer(["alice"]);
    this.blueNode = new SnapServer(["bob"]);

    [this.redNode, this.redNode].forEach(node => {
      node.logMessage({
        time: new Date(),
        from: "alice",
        to: "bob",
        unit: this.unit,
        newTrustLevel: 100
      });
    });
  }
  simulateMessage(
    stateTransition: StateTransition,
    fromNode: string,
    toNode: string,
    from: string,
    to: string
  ): void {
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
  simulateProposing(
    amount: number,
    condition?: string,
    expiresAt?: Date
  ): void {
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
  simulateProposed(): void {
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
  simulateAccepting(): void {
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
  simulateAccepted(): void {
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
  runExample(): void {
    this.simulateProposing(10, condition);
    this.simulateProposed();
    this.simulateAccepting();
    this.simulateAccepted();
  }
}
