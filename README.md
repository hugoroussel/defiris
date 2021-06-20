# Defiris

An exotic derivative. The idea : be exposed to the yield of multiple products while
having your principal in a single one.

A typical use case : 

Alice has usdc because she believes it is safer and wants yield on it but finds the dai yield more attractive
Bob has dai but would like to have his yield in usdc to get exposure on it

Ultimately the idea would be to deposit asset into a contract and get yield from multiple pools : so you stake eth and receive dai, wbtc, bal etc..

# What has been done
1. Simulate the aave market => check test file in `aave-test.js`
2. Simple unsafe 2 counter-parties based on the aave market

# Design choices
The users send base assets DAI, ETH, USDC to the contract that then chooses a pool for them

# To do 

- [] Generalize the contract to multiple parties
- [] Add security features : safeMath, non Reentrancy, timeLocks etc..
- []





