Refactor:

Hubbie Ledger Loops

Ledger Object interface:
on('proposal') -> result
propose(peerName, amount, hashHex, routeId) -> result
sendCtrl(probes/pleaseFinalize)
on('control')
getBalances(filter)

proposal can be (peerName, amount, hashHex, routeId)
result can be fulfillment/ack/reject

balance filters:
 * myBalanceLt (conservative, so assuming my outgoing transactions all succeed, and no incoming pending transactions succeed)
 * myBalanceGt (conservative, so assuming none of my outgoing transactions succeed, and all incoming pending transactions succeed)
