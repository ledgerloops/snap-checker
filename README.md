Simulator of how circular currents can find a globally optimal distribution of debt.

Each node in the network represents a person.
Each edge represents an account between two persons.

Each account has a maximum debt in each direction, and a current debt that can be positive, zero, or negative.

The goal of the algorithm is to reduce the sum of the absolute debt values. For instance, say:

Alice owes Bob between -7 and +7, currently +7
Alice owes Charlie between -7 and +7, currently -5
Bob owes Charlie between -7 and +7, currently +3

Then the total absolute debt is `abs(7) + abs(-5) + abs(3) = 15`.
If Alice pays Bob 2, Bob pays Charlie 2, and Charlie pays Alice 2, the sum of absolute debts is reduced to:
`abs(5) + abs(-7) + abs(1) = 13`, so that's an improvement.
