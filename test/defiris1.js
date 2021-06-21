const { expect } = require("chai");

// Libraries
const BigNumber = require('bignumber.js');
const { ethers } = require("hardhat");
const { defineReadOnly } = require("ethers/lib/utils");

// Constants
const YEAR_IN_SEC = 31556952 // Number of seconds in a year

MINT_AMOUNT = 1000

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

    async function getTokenBalance(token, account) {
        let b2 = await token.balanceOf(account.address)
        return hexToInt(b2._hex, 16)/STABLECOIN_PRECISION
    }

    // SETUP
    // ================================================================================================================================================================
    // Define accounts
    const [acc0, acc1, acc2] = await ethers.getSigners();

    // Get Contracts factories
    const ATokenMock = await ethers.getContractFactory('ATokenMock')
    const ABTokenMock = await ethers.getContractFactory('ABTokenMock')
    const ERC20Mock = await ethers.getContractFactory('ERC20Mock')
    const LendingPoolMock = await ethers.getContractFactory('LendingPoolMock')
    const LendingPoolAddressesProvider = await ethers.getContractFactory('LendingPoolAddressesProviderMock')
    const Defiris = await ethers.getContractFactory('Defiris1')

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
    console.log('aToken2 address', aToken2.address)

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

    // Register the two pools
    await lendingPoolAddressesProvider.setLendingPoolImpl(lendingPool1.address)
    await lendingPoolAddressesProvider.setLendingPoolImpl(lendingPool2.address)

    // here we mint some stable coins to the lending pool to simulate the pool gaining interests..
    await stablecoin1.mint(lendingPool1.address, MINT_AMOUNT*STABLECOIN_PRECISION)
    // mint some tokens for the other participants
    await stablecoin1.mint(acc0.address, MINT_AMOUNT*STABLECOIN_PRECISION)

    // here we mint some stable coins to the lending pool to simulate the pool gaining interests..
    await stablecoin2.mint(lendingPool2.address, MINT_AMOUNT*STABLECOIN_PRECISION)
    // mint some tokens for the other participants acc1 and acc2
    await stablecoin2.mint(acc1.address, MINT_AMOUNT*STABLECOIN_PRECISION)
    await stablecoin2.mint(acc2.address, MINT_AMOUNT*STABLECOIN_PRECISION)

    // ================================================================================================================================================================

    // ACTUAL TESTS

    // 1. Check the balances
    console.log('sc 1 amount of the first account', await getTokenBalance(stablecoin1, acc0))
    console.log('sc 2 amount of the second account', await getTokenBalance(stablecoin2, acc1))

    // 2. deploy defiris contract 
    let defiris = await Defiris.deploy(stablecoin1.address, stablecoin2.address, lendingPool1.address, lendingPool2.address, aToken1.address, aToken2.address);
    console.log('defiris contract address', defiris.address);
    
    // 3. Each counterparty deposits stablecoins into the contract
    // increase allowance for account 1 & 2
    await stablecoin1.approve(defiris.address, 1000*STABLECOIN_PRECISION)
    await stablecoin2.connect(acc1).approve(defiris.address, 100*STABLECOIN_PRECISION)
    await stablecoin2.connect(acc2).approve(defiris.address, 100*STABLECOIN_PRECISION)
    // deposit
    await defiris.depositToken1(stablecoin1.address, 1000*STABLECOIN_PRECISION)
    await defiris.connect(acc1).depositToken2(stablecoin2.address, 100*STABLECOIN_PRECISION)
    await defiris.connect(acc2).depositToken2(stablecoin2.address, 100*STABLECOIN_PRECISION)

    // 4. Pass time & increase interest
    YEARS = 3
    await passTime(YEARS)
    await aToken1.mintInterest(num2str(YEAR_IN_SEC*YEARS))
    await aToken2.mintInterest(num2str(YEAR_IN_SEC*YEARS))
    console.log('balance of defiris of interest bearing token 1', await getTokenBalance(aToken1, defiris))
    console.log('balance of defiris of interest bearing token 2', await getTokenBalance(aToken2, defiris))

    //5. Call withdraw
    await defiris.withdraw()
    console.log('balance of defiris of stablecoin 1', await getTokenBalance(stablecoin1, defiris))
    console.log('balance of defiris of stablecoin 2', await getTokenBalance(stablecoin2, defiris))

    console.log('balance of accO of stablecoins', await getTokenBalance(stablecoin1, acc0), await getTokenBalance(stablecoin2, acc0))
    console.log('balance of acc1 of stablecoins', await getTokenBalance(stablecoin1, acc1), await getTokenBalance(stablecoin2, acc1))
    console.log('balance of acc2 of stablecoins', await getTokenBalance(stablecoin1, acc2), await getTokenBalance(stablecoin2, acc2))


  });
});
