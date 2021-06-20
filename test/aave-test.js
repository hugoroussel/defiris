const { expect } = require("chai");

// Libraries
const BigNumber = require('bignumber.js');
const { ethers } = require("hardhat");

// Constants
const YEAR_IN_SEC = 31556952 // Number of seconds in a year

// Utilities
YEARS = 3
MINT_AMOUNT = 1000
DEPOSIT_AMOUNT = 1000



async function passTime(years, aToken) {
    const time = Date.now() + YEAR_IN_SEC * years
    await ethers.provider.send('evm_setNextBlockTimestamp', [time]); 
    await ethers.provider.send('evm_mine');
    await aToken.mintInterest(num2str(YEAR_IN_SEC*years))
    console.log(years, ' years have passed..')
}

// Converts a JS number into a string that doesn't use scientific notation
function num2str(num) {
    return BigNumber(num).integerValue().toFixed()
}

function hexToInt(hexstring) {
    return parseInt(hexstring, 16);
}

const STABLECOIN_PRECISION = 1e6

describe("Aave", function() {
  it("Should return the new greeting once it's changed", async function() {

    async function getTokenBalance(token, account) {
      let b2 = await token.balanceOf(account.address)
      return hexToInt(b2._hex, 16)/STABLECOIN_PRECISION
    }
    
    // Define accounts
    const [acc0, acc1, acc2] = await ethers.getSigners();

    // Get Contracts factories
    const ATokenMock = await ethers.getContractFactory('ATokenMock')
    const ERC20Mock = await ethers.getContractFactory('ERC20Mock')
    const LendingPoolMock = await ethers.getContractFactory('LendingPoolMock')
    const LendingPoolAddressesProvider = await ethers.getContractFactory('LendingPoolAddressesProviderMock')

    // Deploy a stable coin
    let stablecoin = await ERC20Mock.deploy()
    console.log('stablecoin address', stablecoin.address)

    // Deploy the interest accruing version of the token
    let aToken = await ATokenMock.deploy(stablecoin.address)
    console.log('aToken address', aToken.address)

    // Deploy the lending pool
    let lendingPool = await LendingPoolMock.deploy()
    console.log('lending pool address', lendingPool.address)

    // Sets the lending pool paramaters to the stablecoin address and the interest accruing token
    await lendingPool.setReserveAToken(stablecoin.address, aToken.address)

    // Deploy lending pool registry and and register our lending pool 
    lendingPoolAddressesProvider = await LendingPoolAddressesProvider.deploy()
    console.log('lending pool addresses provider', lendingPoolAddressesProvider.address)
    await lendingPoolAddressesProvider.setLendingPoolImpl(lendingPool.address)


    // Mint 1000 stablecoins into the lending pool to simulate interest gain
    await stablecoin.mint(lendingPool.address, num2str(MINT_AMOUNT*STABLECOIN_PRECISION))

    // Mint 1000 tokens to the first three account
    await stablecoin.mint(acc0.address, num2str(MINT_AMOUNT*STABLECOIN_PRECISION))
    await stablecoin.mint(acc1.address, num2str(MINT_AMOUNT*STABLECOIN_PRECISION))
    await stablecoin.mint(acc2.address, num2str(MINT_AMOUNT*STABLECOIN_PRECISION))

    // Initialize the money market
    /*
    market = await AaveMarket.deploy(lendingPoolAddressesProvider.address, aToken.address, stablecoin.address)
    console.log('aave market address', market.address)
    */
    
    // 1. Deposit stablecoins into the Aave Market by approving and depositing
    await stablecoin.approve(lendingPool.address, DEPOSIT_AMOUNT*STABLECOIN_PRECISION)
    await lendingPool.deposit(stablecoin.address, DEPOSIT_AMOUNT*STABLECOIN_PRECISION, acc0.address, 0)
    
    // 2. check balances
    console.log('balance of aTokens of account 1', await getTokenBalance(aToken, acc0))
    console.log('balance of stablecoins of lending pool', await getTokenBalance(stablecoin, lendingPool))

    // 3. Make the time pass
    await passTime(YEARS, aToken)
    console.log('balance of interestet gaining stablecoins of account A', await getTokenBalance(aToken, acc0))
  });
});
