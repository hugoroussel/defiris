# Defiris

![image info](./public/logo.png)


## Interest rate swaps made easy

### Made for the HackMoney ETHglobal 2021 hackathon

Deposit into the Defiris contract to get exposed to yields on assets you do not own.

For example :

Alice has 100 DAI but would like to be exposed to USDC yield without having to hold USDC. 
Bob has 100 USDC but would like to be exposed to DAI yield without having to hold DAI.

Alice will deposit DAI into the strategy of her choice be it Compound, Aave or 88mph. 
Bob will deposit USDC into the strategy of his choice be it Compound, Aave or 88mph. 

At the end of the locking period Alice will get back its principal + 50% of the interest on her strategy and 50% of the interest on the strategy of Bob. Same thing for Bob.

This has the advantage of making partial interest rate swaps ultra simple. If there is no counterparty, Alice is simply getting interest in the strategy of her choice. If the pool is too imbalanced with a strategy getting too much liquidity, users can withdraw their principal before the end of the locking period with the caveat that they lose the interest accrued so far. 

These are experimental contracts made during a hackathon please do not use in production, many features and security features are lacking. 

# What has been done

1. Simulate the aave market => check test file in `aave-test.js`
2. Simulate the compound market => check test file in `compound-test.js`
3. Simulate the 88mph market => check test file in `88mph-test.js`
4. Fixed to variable contract Aave based 88mph contract with Compound => check contract in `/contracts/defiris/FixedToVariable/Defiris88mphAaveDCompound.sol`
5. Variable to variable for Aave and Compound => check contracts in `/contracts/defiris/VariableToVariable/*.sol`

[I'm an inline-style link](https://github.com/hugoroussel/defiris-frontend)

# To do 

- [x] add a frontend 
- [ ] pool variable to variable compound versus aave
- [ ] add timelocks : start of period, end of period
- [ ] add support for MPH rewards and support for coupon bonds funding
- [ ] add getters
- [ ] add early withdrawal
- [ ] add safeMath








