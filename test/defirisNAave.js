const { expect } = require("chai");
const { ethers } = require("hardhat");
const BigNumber = require('bignumber.js');
const { checkProperties } = require("ethers/lib/utils");

// Constants
const STABLECOIN_PRECISION = 1e6
const MINT_AMOUNT = 1000
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


describe("NAave", function() {
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
    const DefirisNAave = await ethers.getContractFactory('DefirisNAave')
    const ATokenMock = await ethers.getContractFactory('ATokenMock')
    const LendingPoolMock = await ethers.getContractFactory('LendingPoolMock')

    // Deploy stablecoin contracts
    let stablecoin1 = await ERC20Mock.deploy()
    let stablecoin2 = await ERC20Mock.deploy()
    let stablecoin3 = await ERC20Mock.deploy()
    console.log('stablecoin address', stablecoin1.address)
    console.log('stablecoin address', stablecoin2.address)
    console.log('stablecoin address', stablecoin3.address)
    
    // Deploy aTokens 
    let aToken1 = await ATokenMock.deploy(stablecoin1.address)
    let aToken2 = await ATokenMock.deploy(stablecoin2.address)
    let aToken3 = await ATokenMock.deploy(stablecoin3.address)
    console.log('aToken 1', aToken1.address)
    console.log('aToken 2', aToken2.address)
    console.log('aToken 3', aToken3.address)


    // deploy lending pools
    let lendingPool1 = await LendingPoolMock.deploy()
    let lendingPool2 = await LendingPoolMock.deploy()
    let lendingPool3 = await LendingPoolMock.deploy()
    console.log('lending pool 1', lendingPool1.address)
    console.log('lending pool 2', lendingPool2.address)
    console.log('lending pool 3', lendingPool3.address)

    // set the reserve tokens 
    await lendingPool1.setReserveAToken(stablecoin1.address, aToken1.address)
    await lendingPool2.setReserveAToken(stablecoin2.address, aToken2.address)
    await lendingPool3.setReserveAToken(stablecoin3.address, aToken3.address)

    const mintAmount = MINT_AMOUNT*STABLECOIN_PRECISION

    // Mint some stablecoins for the lending pools to simulate interest gaining
    await stablecoin1.mint(lendingPool1.address, mintAmount)
    await stablecoin2.mint(lendingPool2.address, mintAmount)
    await stablecoin3.mint(lendingPool3.address, mintAmount)

    // Mint stablecoins for the accounts
    await stablecoin1.mint(acc0.address, mintAmount)

    await stablecoin2.mint(acc1.address, mintAmount)
    await stablecoin2.mint(acc0.address, mintAmount)

    await stablecoin3.mint(acc2.address, mintAmount)

    let defiris = await DefirisNAave.deploy(
        [stablecoin1.address, stablecoin2.address, stablecoin3.address],
        [lendingPool1.address, lendingPool2.address, lendingPool3.address],
        [aToken1.address, aToken2.address, aToken3.address],

    )

    console.log('defiris address', defiris.address)

    stablecoin1.approve(defiris.address, mintAmount)
    defiris.deposit(stablecoin1.address, mintAmount)

    //stablecoin2.approve(defiris.address, mintAmount)
    //defiris.deposit(stablecoin2.address, mintAmount)

    console.log('sc2 amount acc1', await getTokenBalance(stablecoin2, acc1))
    
    stablecoin2.connect(acc1).approve(defiris.address, mintAmount)
    defiris.connect(acc1).deposit(stablecoin2.address, mintAmount)

    stablecoin3.connect(acc2).approve(defiris.address, mintAmount)
    defiris.connect(acc2).deposit(stablecoin3.address, mintAmount)

    console.log('sc2 amount acc1', await getTokenBalance(aToken1, defiris))
    console.log('sc2 amount acc1', await getTokenBalance(aToken2, defiris))
    console.log('sc2 amount acc1', await getTokenBalance(aToken3, defiris))

    await passTime(3)

    await aToken1.mintInterest(YEAR_IN_SEC*3)
    await aToken2.mintInterest(YEAR_IN_SEC*3)
    await aToken3.mintInterest(YEAR_IN_SEC*3)

    await defiris.withdraw()

    console.log('sc1 amount defiris', await getTokenBalance(stablecoin1, defiris))
    console.log('sc2 amount defiris', await getTokenBalance(stablecoin2, defiris))
    console.log('sc3 amount defiris', await getTokenBalance(stablecoin3, defiris))


    console.log('sc1 amount acc0', await getTokenBalance(stablecoin1, acc0))
    console.log('sc2 amount acc0', await getTokenBalance(stablecoin2, acc0))
    console.log('sc3 amount acc0', await getTokenBalance(stablecoin3, acc0))

    console.log('sc1 amount acc1', await getTokenBalance(stablecoin1, acc1))
    console.log('sc2 amount acc1', await getTokenBalance(stablecoin2, acc1))
    console.log('sc3 amount acc1', await getTokenBalance(stablecoin3, acc1))

    console.log('sc1 amount acc2', await getTokenBalance(stablecoin1, acc2))
    console.log('sc2 amount acc2', await getTokenBalance(stablecoin2, acc2))
    console.log('sc3 amount acc2', await getTokenBalance(stablecoin3, acc2))


    
    




  });
});
