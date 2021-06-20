const { expect } = require("chai");

// Libraries
const BigNumber = require('bignumber.js');
const { ethers } = require("hardhat");

// Constants
const YEAR_IN_SEC = 31556952 // Number of seconds in a year

const INTEREST_RATE = 1.1

// Utilities

YEARS = 3

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

    // Define accounts
    const [acc0, acc1, acc2] = await ethers.getSigners();

    // Get Contracts factories
    const AaveMarket = await ethers.getContractFactory('AaveMarket')
    const ATokenMock = await ethers.getContractFactory('ATokenMock')
    const ERC20Mock = await ethers.getContractFactory('ERC20Mock')
    const LendingPoolMock = await ethers.getContractFactory('LendingPoolMock')
    const LendingPoolAddressesProvider = await ethers.getContractFactory('LendingPoolAddressesProviderMock')
    const Defiris = await ethers.getContractFactory('Defiris')

    // Deploy a stable coin
    let stablecoin = await ERC20Mock.deploy()
    console.log('stablecoin address', stablecoin.address)

    // Deploy the lended version of the stablecoin?
    let aToken = await ATokenMock.deploy(stablecoin.address)
    console.log('aToken address', aToken.address)

    // Deploy the lending pool
    let lendingPool = await LendingPoolMock.deploy()
    console.log('lending pool address', lendingPool.address)

    // Sets the reserve pair
    await lendingPool.setReserveAToken(stablecoin.address, aToken.address)

    // Setup the lending pool addresses providers
    lendingPoolAddressesProvider = await LendingPoolAddressesProvider.deploy()
    console.log('lending pool addresses provider', lendingPoolAddressesProvider.address)
    await lendingPoolAddressesProvider.setLendingPoolImpl(lendingPool.address)

    // Mint some stablecoins
    const mintAmount = 1000 * STABLECOIN_PRECISION
    console.log(num2str(mintAmount))

    // here we mint some stable coins to the lending pool to simulate the pool gaining interests..
    await stablecoin.mint(lendingPool.address, num2str(mintAmount*10))

    // mint some tokens for the other participants
    await stablecoin.mint(acc0.address, num2str(mintAmount))
    await stablecoin.mint(acc1.address, num2str(mintAmount))
    await stablecoin.mint(acc2.address, num2str(mintAmount))

    // Initialize the money market
    market = await AaveMarket.deploy(lendingPoolAddressesProvider.address, aToken.address, stablecoin.address)

    console.log('aave market address', market.address)
    
    // Try to deposit stable coins into the aave market and see if you get interest after a given period

    // 1. try to get the balances of token of one account
    let b1 = await stablecoin.balanceOf(acc1.address)
    console.log('balance of stablecoins of account 1', hexToInt(b1._hex, 16)/STABLECOIN_PRECISION)

    let b2 = await aToken.balanceOf(acc1.address)
    console.log('balance of aave stablecoins of account 1', hexToInt(b2._hex, 16)/STABLECOIN_PRECISION)

    // 2. try to deposit stablecoins into the aave market

    DEPOSIT_AMOUNT = 1000
    // first increase the allowance of the lending pool then deposit
    await stablecoin.approve(lendingPool.address, DEPOSIT_AMOUNT*STABLECOIN_PRECISION)
    // then invoke the deposit function
    await lendingPool.deposit(stablecoin.address, DEPOSIT_AMOUNT*STABLECOIN_PRECISION, acc0.address, 0)
    
    // the balances should reflect the new situation
    let b3 = await stablecoin.balanceOf(acc0.address)
    console.log('balance of stablecoins of account 1', hexToInt(b3._hex, 16)/STABLECOIN_PRECISION)
    let b4 = await aToken.balanceOf(acc0.address)
    console.log('balance of aave stablecoins of account 1', hexToInt(b4._hex, 16)/STABLECOIN_PRECISION)

    // 3. make the time pass..
    await passTime(YEARS, aToken)
    let b5t = await stablecoin.balanceOf(lendingPool.address)
    console.log('balance of stablecoins of lending pool', hexToInt(b5t._hex, 16)/STABLECOIN_PRECISION)

    // 4. now try to take out profit?

    await lendingPool.withdraw(stablecoin.address, 1300*STABLECOIN_PRECISION, acc0.address)
    // the balances should reflect the new situation
    let b5 = await stablecoin.balanceOf(acc0.address)
    console.log('balance of stablecoins of account 1', hexToInt(b5._hex, 16)/STABLECOIN_PRECISION)
    let b6 = await aToken.balanceOf(acc0.address)
    console.log('balance of aave stablecoins of account 1', hexToInt(b6._hex, 16)/STABLECOIN_PRECISION)


    // 5. Deploy defiris contract
    let defiris = await Defiris.deploy(stablecoin.address, aToken.address, lendingPool.address)
    console.log('address of defiris contract', defiris.address)

    let b7 = await stablecoin.balanceOf(lendingPool.address)
    console.log('balance of stablecoins of lending pool', hexToInt(b7._hex, 16)/STABLECOIN_PRECISION)

    // 6. Deposit tokens into contract
    await stablecoin.approve(defiris.address, 4*10*STABLECOIN_PRECISION)
    let allowance_defiris_contract = await defiris.deposit(10*STABLECOIN_PRECISION)

    let b8 = await stablecoin.balanceOf(acc0.address)
    console.log('balance of stablecoins of account 1', hexToInt(b8._hex, 16)/STABLECOIN_PRECISION)

    let b9 = await stablecoin.balanceOf(lendingPool.address)
    console.log('balance of stablecoins of lending pool', hexToInt(b9._hex, 16)/STABLECOIN_PRECISION)

    

    // 7. pass time ..

    await passTime(3, aToken)

    let b10 = await aToken.balanceOf(defiris.address)
    console.log('balance of stablecoins of lending pool', hexToInt(b10._hex, 16)/STABLECOIN_PRECISION)


    // 8. withdraw tokens from contract

    await defiris.withdraw()
    let b11 = await stablecoin.balanceOf(acc0.address)
    console.log('balance of stablecoins of lending pool', hexToInt(b11._hex, 16)/STABLECOIN_PRECISION)





  });
});
