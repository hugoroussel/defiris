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
- [ ]  generalize for n assets by pool => done for aave
- [ ]  integrate 88mph
- [ ]  How to compute total balance for non stablecoins assets?
- [ ]  How to handle an user using multiple pools?

# "Maths"

Concerning first to do : users should be able to send multiple assets and get their respective shares of the interest. 

Let's say we have one pool with 10% APY  USDT and one with 5% APY DAI

Alice drops 800 USDT
Bob drops 100 DAI
Charles drops 100 DAI

After three years :

We have in the pool 

1040 aUSDT
115 aDAI
115 aDAI

total interest : 
240 USDT
15+15 = 30 DAI
Since Alice contributed to 80% of the pool initially and the others to 10% each we should have 

0.8*270 = 216 going to Alice 
0.1*270 = 27 going to Bob
0.1*270 = 27 going to Charles

We just split the interest on each asset by the % of the pool you own i.e
For Alice 0.8*24O+0.8*30
For Bob 0.1*240+0.1*30
etc.






