const { expect } = require("chai");
const { ethers } = require("hardhat");
const BigNumber = require('bignumber.js');

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

    // Deploy contracts

    let stablecoin = await ERC20Mock.deploy()
    console.log('stablecoin address', stablecoin.address)

    let cToken = await CERC20Mock.deploy(stablecoin.address)
    console.log('cToken address', cToken.address)

    // Mint tokens
    const mintAmount = 1000 * STABLECOIN_PRECISION
    await stablecoin.mint(cToken.address, mintAmount)
    await stablecoin.mint(acc0.address, mintAmount)
    await stablecoin.mint(acc1.address, mintAmount)
    await stablecoin.mint(acc2.address, mintAmount)

    // mint cTokens
    await stablecoin.approve(cToken.address, mintAmount)
    await cToken.mint(mintAmount)
    console.log('account 1 stablecoin balance', await getTokenBalance(stablecoin, acc0))
    console.log('cToken contract stablecoin balance', await getTokenBalance(stablecoin, cToken))

    // pass time
    await passTime(3)

    // compute the rate & withdraw profits
    const currentExRate = await cToken.exchangeRateStored();
    const currentExRateInt = hexToInt(currentExRate._hex)
    console.log('current ex rate', currentExRateInt)
    const rateAfterTimePasses = currentExRate *(1 + 3 * INIT_INTEREST_RATE)
    console.log('rateAfterTimePasses', rateAfterTimePasses)
    await cToken._setExchangeRateStored(rateAfterTimePasses)
    await cToken.redeemUnderlying((rateAfterTimePasses/currentExRate)*mintAmount)
    console.log('account 1 stablecoin balance', await getTokenBalance(stablecoin, acc0))
  });
});
