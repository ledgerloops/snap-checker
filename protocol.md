SNAP is a protocol for peer-to-peer trustlines. There are two participants in the trustline, and no third-party to act as ledger or verifier. It assumes that a message, when sent by one party, is either received intact by the other party, or not received at all, and no messages arrive unless the other party sent it. As long as neither of the party sends any invalid messages, the protocol is guaranteed not to get out-of-sync, even if some messages are lost.
 
There are three message types, PROPOSE / ACCEPT / REJECT. They are JSON in the reference implementation, but I'll also publish ASN1 definition so people can encode SNAP messages in OER or XML. In the PROPOSE, there's an integer amount, and  "unit", which could be e.g. "1E-6 USD" for micro-dollars. In ACCEPT and REJECT messages, there is a messageId that links them to an earlier PROPOSE from the other party. MessageId's should be unique per sender.
PROPOSE can be conditional or unconditional. If it's conditional, then the ACCEPT should mention the correct preimage (32 bytes) for the SHA256 condition (also 32 bytes).
 
The roles of the two parties in the protocol is symmetric, so Bob can also play the role of "PROPOSE"  sender, and then Alice should reply with "ACCEPT" or "REJECT" in the same way (but in this description I'm using an example where Alice proposes a transfer and Bob responds). 
 
The transfer life cycle works as follows:
* Alice decides to send a transfer to Bob. This brings the transfer into "NEW" state.
* Alice sends a PROPOSE. This brings the transfer into "Alice:PENDING / Bob:NEW" state.
* If Bob receives the PROPOSE, that brings the transfer into "PENDING" state.
* If Bob sends an ACCEPT, that brings the transfer into "Alice:PENDING / Bob:ACCEPTED" state.
* If Bob sends a REJECT, that brings the transfer into "Alice:PENDING / Bob:REJECTED" state.
* If Alice receives an ACCEPT, that brings the transfer into "ACCEPTED" state.
* If Alice receives a REJECT, that brings the transfer into "REJECTED" state.
* Alice may resend the PROPOSE message as long as the transfer is in one of the "Alice:PENDING" states, i.e. until she gets back an ACCEPT or REJECT response from Bob. This does not change the state of the transfer (it's  idempotent).
* Alice and Bob each have a current, payable, and receivable balance, and both parties keep track of all 6 numbers as the transfer goes through its life cycle:
  * When a proposal from Alice becomes pending, the amount is:
    * substracted from Alice's current balance
    * added to Alice's payable balance
    * added to Bob's receivable balance
  * When a proposal from Alice is accepted, the amount is:
    * added to Bob's current balance
    * substracted from Alice's payable balance
    * substracted from Bob's receivable balance
  * When a proposal from Alice is accepted, the amount is:
    * added back to Alice's current balance
    * substracted from Alice's payable balance
    * substracted from Bob's receivable balance
 
* There is no built-in support for detecting invalid messages; that means transfers always stay pending until a response is successfully sent back. Specifically:
  * when Bob tries to accept a conditional transfer using the wrong preimage, Alice should ignore this and keep resending her PROPOSE indefinitely,
  * when Bob still tries to accept a proposal for which he already sent a REJECT earlier, or vice versa, Alice should ignore these extra responses.
  * when Bob sends an ACCEPT or REJECT for a messageId which Alice knows nothing about, Alice should ignore this.
  * when Alice sends a malformed PROPOSE, Bob should ignore this.
  * the decision of whether to eventually accept or reject a proposal is entirely up to Bob (except of course if he doesn't have the valid preimage to accept a conditional proposal)
  * when Bob takes too long to respond (doesn't send an ACCEPT, and also doesn't send a REJECT), there is nothing built-in which Alice can do about this. There may be a hard timeout (like for conditional transfers in ILP), or just a general understanding of unresponsiveness (like may be useful in some other settings), and Alice may feel tricked if Bob accepts a very old proposal (especially if Alice already rejected her own incoming transfer, of course). Alice should then resolve her dispute with Bob about this out-of-band; the SNAP protocol defines Alice and Bob's balances without looking at the clock (that's to say, Bob effectively decides if he's within the timeout, or too late sending his fulfillment of a conditional transfer).
* There is also no built-in way to sanity-check the balance. There is a unique way to calculate the six balances (current/payable/receivable for Alice and for Bob) from any SNAP message log, but if there is a dispute about what the content of the message log was, or one of the two parties use a buggy implementation, it's out of scope for SNAP to resolve this.
* extra fields are allowed in PROPOSE/ACCEPT/REJECT messages; they don't affect how transfers change state, nor how the balances change.
* extra message types are allowed as long as their name is different from PROPOSE/ACCEPT/REJECT messages; again, they don't affect how transfers change state, nor how the balances change.
* there are several standard ways to exchange SNAP messages, e.g. a WebSocket, with /username/token in the WebSocket server URL for authentication, and with the 'snap-1.0' subprotocol. Or a HTTP POST, again with /username/token in the URL. There, response status is always 200, even if the service "successfully decides to reject a proposal" :) I'm also working on a WebRTC one.

The reference implementation of SNAP is used in the "Network Money" browser extension, which reacts to the "ledger" link-rel in html pages you visit, so that makes it a useful protocol also for monetizing IndieWeb blogposts!

# Example transcript (unconditional, rejected)
* Alice -> Bob:
  * `msgType: 'PROPOSE'`
  * `msgId: 37`
  * `amount: 5`
  * `unit: '1E-6 USD'`

* Bob -> Alice:
  * `msgType: 'REJECT'`
  * `msgId: 37`
  * `reason: 'not interested'`

# Example transcript (conditional, accepted)

* Bob -> Alice:
  * `msgType: 'PROPOSE'`
  * `msgId: 18`
  * `condition: 'adf6482b679993104297b720fd154ad877700f491f3184552c0adcb745ac3308'`
  * `amount: 8`
  * `unit: '1E0 EUR'`

* Alice -> Bob:
  * `msgType: 'ACCEPT'`
  * `msgId: 18`
  * `preimage: '105580cad26868e3a356cca1ad3a1eb165ce9bf8ada72b2ccfcc04d4810355fa'`
