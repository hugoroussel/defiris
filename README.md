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
3. Simple unsafe multiple counter-parties based on the aave market

# Design choices

The users send base assets DAI, ETH, USDC to the contract that then chooses a pool for them

# To do 

- [x] Generalize the contract to multiple parties
- [x] Add a second pool :)
- [ ] Think about adding more assets/multiple assets by users
- [ ] add a frontend 
- [ ] add non stablecoin assets
- [ ] Think about letting users withdraw at anytime
- [ ] Add security features : safeMath, non Reentrancy, timeLocks etc..

# To do now

- [x] generalize for n assets by pool => done for compound
- [x]  generalize for n assets by pool => done for aave
- [x]  How to handle an user using multiple pools? => for now don't let this happen, improve it afterwards
- [x]  integrate 88mph
- [x]  simple first step => interest versus floating 88mph versus Aave
- [ ]  nice proof of concept/draft => create actual contracts, also the withdraw method should be callable by each user and not someone random paying ton of gas..
- [ ]  create getters for the frontend
- [ ]  start to think about a demo
- [ ]  handle mph token rewards
- [ ]  clean up the repo even for a hackathon it's embarassing..
- [ ]  How to compute total balance for non stablecoins assets?

# Local development 

run 
`npx hardhat node`

run your scripts without forgetting to add 
`--network localhost`







