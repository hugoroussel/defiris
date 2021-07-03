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
  it("Run the defiris example with n pools", async function() {

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
    const DefirisCompound = await ethers.getContractFactory('DefirisNCompound')

    // Deploy stablecoin contract
    let stablecoin1 = await ERC20Mock.deploy()
    console.log('stablecoin address', stablecoin1.address)
    let stablecoin2 = await ERC20Mock.deploy()
    console.log('stablecoin address', stablecoin2.address)
    let stablecoin3 = await ERC20Mock.deploy()
    console.log('stablecoin address', stablecoin3.address)
    
    // Deploy cToken contract (<=> lending pool in aave)
    let cToken1 = await CERC20Mock.deploy(stablecoin1.address)
    console.log('cToken address', cToken1.address)

    let cToken2 = await CERC20Mock.deploy(stablecoin2.address)
    console.log('cToken address', cToken2.address)

    let cToken3 = await CERC20Mock.deploy(stablecoin3.address)
    console.log('cToken address', cToken3.address)

    // Mint tokens
    const mintAmount = 1000 * STABLECOIN_PRECISION

    // Here we mint some tokens to the compoung lending pool
    await stablecoin1.mint(cToken1.address, mintAmount)
    await stablecoin1.mint(acc0.address, mintAmount)
    // await stablecoin1.mint(acc1.address, mintAmount)

    await stablecoin2.mint(cToken2.address, mintAmount)
    // await stablecoin2.mint(acc0.address, mintAmount)
    await stablecoin2.mint(acc1.address, mintAmount)

    await stablecoin3.mint(cToken3.address, mintAmount)
    // await stablecoin2.mint(acc0.address, mintAmount)
    await stablecoin3.mint(acc2.address, mintAmount)

    // Deploy DefirisCompound contract
    const defiris = await DefirisCompound.deploy(
        [stablecoin1.address, stablecoin2.address, stablecoin3.address],
        [cToken1.address, cToken2.address, cToken3.address],
        )
    console.log('address of defiris compound contract', defiris.address)

    // ================================================================================================================================================================

    await stablecoin1.approve(defiris.address, mintAmount)
    await defiris.deposit(stablecoin1.address, mintAmount)

    await stablecoin2.connect(acc1).approve(defiris.address, mintAmount)
    await defiris.connect(acc1).deposit(stablecoin2.address, mintAmount)
    
    await stablecoin3.connect(acc2).approve(defiris.address, mintAmount)
    await defiris.connect(acc2).deposit(stablecoin3.address, mintAmount)

    // Pass time and gain some interest
    YEARS = 3
    passTime(YEARS)     


    const currentExRate = await cToken1.exchangeRateStored();
    const currentExRateInt = hexToInt(currentExRate._hex)
    const rateAfterTimePasses = currentExRateInt *(1 + YEARS * INIT_INTEREST_RATE)
    await cToken1._setExchangeRateStored(rateAfterTimePasses)
    await cToken2._setExchangeRateStored(rateAfterTimePasses)
    await cToken3._setExchangeRateStored(rateAfterTimePasses)

    await defiris.withdraw()
    await defiris.connect(acc1).withdraw()
    await defiris.connect(acc2).withdraw()





    console.log('balance of contract', await getTokenBalance(stablecoin1, defiris))
    console.log('balance of contract', await getTokenBalance(stablecoin2, defiris))
    console.log('balance of contract', await getTokenBalance(stablecoin3, defiris))


    console.log('balance of account 0', await getTokenBalance(stablecoin1, acc0))
    console.log('balance of account 0', await getTokenBalance(stablecoin2, acc0))
    console.log('balance of account 0', await getTokenBalance(stablecoin3, acc0))

    console.log('balance of account 1', await getTokenBalance(stablecoin1, acc1))
    console.log('balance of account 1', await getTokenBalance(stablecoin2, acc1))
    console.log('balance of account 1', await getTokenBalance(stablecoin3, acc1))

    console.log('balance of account 2', await getTokenBalance(stablecoin1, acc2))
    console.log('balance of account 2', await getTokenBalance(stablecoin2, acc2))
    console.log('balance of account 2', await getTokenBalance(stablecoin3, acc2))








  });
});
