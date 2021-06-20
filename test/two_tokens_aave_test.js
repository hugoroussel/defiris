const { expect } = require("chai");

// Libraries
const BigNumber = require('bignumber.js');
const { ethers } = require("hardhat");

// Constants
const YEAR_IN_SEC = 31556952 // Number of seconds in a year

const INTEREST_RATE = 1.1

// Utilities

YEARS = 3

async function passTime(years) {
    const time = Date.now() + YEAR_IN_SEC * years
    await ethers.provider.send('evm_setNextBlockTimestamp', [time]); 
    await ethers.provider.send('evm_mine');
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
    const ABTokenMock = await ethers.getContractFactory('ABTokenMock')
    const ERC20Mock = await ethers.getContractFactory('ERC20Mock')
    const LendingPoolMock = await ethers.getContractFactory('LendingPoolMock')
    const LendingPoolAddressesProvider = await ethers.getContractFactory('LendingPoolAddressesProviderMock')
    const Defiris = await ethers.getContractFactory('Defiris')

    // Deploy stable coin one 
    let stablecoin1 = await ERC20Mock.deploy()
    console.log('stablecoin one address', stablecoin1.address)

    // Deploy stable coin one 
    let stablecoin2 = await ERC20Mock.deploy()
    console.log('stablecoin two address', stablecoin2.address)

    // Deploy the lended version of the stablecoin 1
    let aToken1 = await ATokenMock.deploy(stablecoin1.address)
    console.log('aToken1 address', aToken1.address)

    // Deploy the lended version of the stablecoin 2
    let aToken2 = await ABTokenMock.deploy(stablecoin2.address)
    console.log('aToken1 address', aToken2.address)

    // Deploy the first lending pool
    let lendingPool1 = await LendingPoolMock.deploy()
    console.log('lending pool 1 address', lendingPool1.address)

    // Deploy the second lending pool
    let lendingPool2 = await LendingPoolMock.deploy()
    console.log('lending pool 2 address', lendingPool2.address)

    // Sets the reserve pair for the first pool
    await lendingPool1.setReserveAToken(stablecoin1.address, aToken1.address)

    // Sets the reserve pair for the second pool
    await lendingPool2.setReserveAToken(stablecoin2.address, aToken2.address)

    // Setup the lending pool addresses providers
    lendingPoolAddressesProvider = await LendingPoolAddressesProvider.deploy()
    console.log('lending pool addresses provider', lendingPoolAddressesProvider.address)

    await lendingPoolAddressesProvider.setLendingPoolImpl(lendingPool1.address)
    await lendingPoolAddressesProvider.setLendingPoolImpl(lendingPool2.address)

    // Mint some stablecoins
    const mintAmount = 1000 * STABLECOIN_PRECISION
    console.log(num2str(mintAmount))

    // here we mint some stable coins to the lending pool to simulate the pool gaining interests..
    await stablecoin1.mint(lendingPool1.address, num2str(10*mintAmount*10))

    // mint some tokens for the other participants
    await stablecoin1.mint(acc0.address, num2str(mintAmount))

    // here we mint some stable coins to the lending pool to simulate the pool gaining interests..
    await stablecoin2.mint(lendingPool2.address, num2str(10*mintAmount*10))

    // mint some tokens for the other participants
    await stablecoin2.mint(acc1.address, num2str(mintAmount))


    // Initialize the money market
    market = await AaveMarket.deploy(lendingPoolAddressesProvider.address, aToken1.address, stablecoin1.address)
    console.log('aave market address', market.address)
    
    // Try to deposit stable coins into the aave market and see if you get interest after a given period

    // 1. try to get the balances of token of one account
    let b1 = await stablecoin1.balanceOf(acc0.address)
    console.log('balance of stablecoin 1 of account 0', hexToInt(b1._hex, 16)/STABLECOIN_PRECISION)

    let b2 = await stablecoin2.balanceOf(acc1.address)
    console.log('balance of stablecoin 2 of account 1', hexToInt(b2._hex, 16)/STABLECOIN_PRECISION)

    // 2. deploy defiris contract 

    let defiris = await Defiris.deploy(stablecoin1.address, aToken1.address, lendingPool1.address, stablecoin2.address, aToken2.address, lendingPool2.address)
    console.log('defiris contract address', defiris.address);

    // 3. Each counter party deposits money into the contract

    await stablecoin1.approve(defiris.address, 1000*STABLECOIN_PRECISION)
    await stablecoin2.connect(acc1).approve(defiris.address, 1000*STABLECOIN_PRECISION)
    await defiris.depositToken1(1000*STABLECOIN_PRECISION)
    await defiris.connect(acc1).depositToken2(1000*STABLECOIN_PRECISION)

    // 4. Pass the time..
    passTime(3, aToken1, aToken2)
    await aToken1.mintInterest(num2str(YEAR_IN_SEC*3))
    await aToken2.mintInterest(num2str(YEAR_IN_SEC*3))

    // 5. Check the balances
    let b3 = await aToken1.balanceOf(defiris.address)
    console.log('balance of stablecoin 2 of account 1', hexToInt(b3._hex, 16)/STABLECOIN_PRECISION)
    let b4 = await aToken2.balanceOf(defiris.address)
    console.log('balance of stablecoin 2 of account 1', hexToInt(b4._hex, 16)/STABLECOIN_PRECISION)


    // 6. A counterparty decides to withdraw


    await defiris.withdraw()

    // 5. Check the balances
    let b5 = await stablecoin2.balanceOf(acc0.address)
    console.log('balance of stablecoin 1 of account 1', hexToInt(b5._hex, 16)/STABLECOIN_PRECISION)
    let b6 = await stablecoin2.balanceOf(acc1.address)
    console.log('balance of stablecoin 2 of account 1', hexToInt(b6._hex, 16)/STABLECOIN_PRECISION)




  });
});
