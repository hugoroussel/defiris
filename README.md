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
- [] Create a second token with a different rate of interest
- [] Understand the "liquidity rate" in the AMockToken