# Defiris

Port Interest Rate Swaps onto the blockchain.

Typical use case : be exposed to the yield of one asset while keeping your funds into a different asset

What has been done so far : 

1. Simulate the aave market, deposit and get the interest withdrawn

# To do 

1.


### Todo 

- [x]  Create a first "proxy" contract where the user can deposit tokens that will then deposit them for them into a lending pool 
- [x] Withdraw principal and interest from the proxy contract before sending it back to the user
- [x] Find way to get interest accrued over time by the contract
- [x] Create a second token with a different rate of interest

- [] Clean up contract : users should deposit aTokens directly, implement security & structure
- [] Understand the "liquidity rate" in the AMockToken


Current issue : the contract has to deposit to the lending pools to be registered as a user of the interest gaining token... 

Two choices : 

- either we make a small initial deposit in the constructor which means initiliazing with the two lending pools and have the contract have some small amount of stable coins

disadvantages : seems hacky as hell

- or we just make the users deposit their base assets and we take strategies for them...
advantages :
 better UX (don't need to get access to aave and compound etc..)
 more complicated?

 Okay let's go with #2




