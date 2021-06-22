const { expect } = require("chai");
const { ethers } = require("hardhat");
const BigNumber = require('bignumber.js');
const { checkProperties } = require("ethers/lib/utils");

// Constants
const STABLECOIN_PRECISION = 1e6
const INIT_INTEREST_RATE = 0.1 // 10% APY
const YEAR_IN_SEC = 31556952 // Number of seconds in a year

// Helpers functions
function hexToInt(hexstring) {
    return parseInt(hexstring, 16);
}

async function passTime(years) {
    const time = Date.now() + YEAR_IN_SEC * years
    await ethers.provider.send('evm_setNextBlockTimestamp', [time]); 
    await ethers.provider.send('evm_mine');
    console.log(years, ' years have passed..')
}


describe("Compound", function() {
  it("Should run a simple compound example", async function() {

    async function getTokenBalance(token, account) {
        let b2 = await token.balanceOf(account.address)
        return hexToInt(b2._hex, 16)/STABLECOIN_PRECISION
    }

    const timePass = async (timeInYears) => {
        await timeTravel(timeInYears * YEAR_IN_SEC)
        
    }

    // SETUP
    // ================================================================================================================================================================

    // Setup accounts
    [acc0, acc1, acc2] = await ethers.getSigners()

    // Get Contracts factories
    const ERC20Mock = await ethers.getContractFactory('ERC20Mock')
    const CERC20Mock = await ethers.getContractFactory('CERC20Mock')
    const DefirisCompound = await ethers.getContractFactory('DefirisCompound')

    // Deploy stablecoin contract
    let stablecoin1 = await ERC20Mock.deploy()
    console.log('stablecoin address', stablecoin1.address)
    let stablecoin2 = await ERC20Mock.deploy()
    console.log('stablecoin address', stablecoin2.address)
    
    // Deploy cToken contract (<=> lending pool in aave)
    let cToken1 = await CERC20Mock.deploy(stablecoin1.address)
    console.log('cToken address', cToken1.address)
    let cToken2 = await CERC20Mock.deploy(stablecoin2.address)
    console.log('cToken address', cToken2.address)

    // Mint tokens
    const mintAmount = 1000 * STABLECOIN_PRECISION

    // Here we mint some tokens to the compoung lending pool
    await stablecoin1.mint(cToken1.address, mintAmount)
    await stablecoin1.mint(acc0.address, mintAmount)
    // await stablecoin1.mint(acc1.address, mintAmount)

    await stablecoin2.mint(cToken2.address, mintAmount)
    // await stablecoin2.mint(acc0.address, mintAmount)
    await stablecoin2.mint(acc1.address, mintAmount)

    // Deploy DefirisCompound contract
    const defiris = await DefirisCompound.deploy(1, 730, stablecoin1.address, stablecoin2.address, cToken1.address, cToken2.address)
    console.log('address of defiris compound contract', defiris.address)

    // ================================================================================================================================================================

    // acc0 deposits funds into the contract
    await stablecoin1.approve(defiris.address, mintAmount)
    await defiris.depositToken1(stablecoin1.address, mintAmount)

    // check the accounts
    console.log('balance of cToken contract with stablecoins', await getTokenBalance(stablecoin1, cToken1))
    console.log('balance of acc0 with stablecoins', await getTokenBalance(stablecoin1, acc0))
    console.log('balance of defiris contract', await getTokenBalance(cToken1, defiris))

    // acc2 deposits funds into the contract too 
    await stablecoin2.connect(acc1).approve(defiris.address, mintAmount)
    await defiris.connect(acc1).depositToken2(stablecoin2.address, mintAmount)

    // check the accounts
    console.log('balance of cToken contract with stablecoins', await getTokenBalance(stablecoin2, cToken2))
    console.log('balance of acc1 with stablecoins', await getTokenBalance(stablecoin2, acc1))
    console.log('balance of defiris contract', await getTokenBalance(cToken2, defiris))

    // let the time pass
    YEARS = 3
    passTime(YEARS)

    // Some operations for changing the rate

    const currentExRate = await cToken1.exchangeRateStored();
    const currentExRateInt = hexToInt(currentExRate._hex)
    console.log('current ex rate', currentExRateInt)

    // modify manually the exchange rate of the mocked tokens
    const rateAfterTimePasses = currentExRateInt *(1 + YEARS * INIT_INTEREST_RATE)
    console.log('rateAfterTimePasses', rateAfterTimePasses)
    await cToken1._setExchangeRateStored(rateAfterTimePasses)
    await cToken2._setExchangeRateStored(rateAfterTimePasses)
    
    
    let rate = await cToken2.exchangeRateStored()
    console.log('is the rate stored', hexToInt(rate._hex))
    console.log('balance of acc0 contract for sc1', await getTokenBalance(stablecoin1, acc0))

    console.log('balance of defiris contract for sc1', await getTokenBalance(stablecoin1, defiris))
    console.log('balance of defiris contract for sc2', await getTokenBalance(stablecoin2, defiris))
    console.log('balance of acc0 contract for sc1', await getTokenBalance(stablecoin1, acc0))
    console.log('balance of acc0 contract for sc2', await getTokenBalance(stablecoin2, acc0))
    console.log('balance of acc1 contract for sc1', await getTokenBalance(stablecoin1, acc1))
    console.log('balance of acc1 contract for sc2', await getTokenBalance(stablecoin2, acc1))


    await defiris.withdraw()

    console.log('balance of defiris contract for sc1', await getTokenBalance(stablecoin1, defiris))
    console.log('balance of defiris contract for sc2', await getTokenBalance(stablecoin2, defiris))
    console.log('balance of acc0 contract for sc1', await getTokenBalance(stablecoin1, acc0))
    console.log('balance of acc0 contract for sc2', await getTokenBalance(stablecoin2, acc0))
    console.log('balance of acc1 contract for sc1', await getTokenBalance(stablecoin1, acc1))
    console.log('balance of acc1 contract for sc2', await getTokenBalance(stablecoin2, acc1))





  });
});
