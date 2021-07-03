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

describe("Yearn", function() {
  it("Should run a simple yearn mock example", async function() {

    // SETUP
    // ================================================================================================================================================================

    async function getTokenBalance(token, account) {
      let b2 = await token.balanceOf(account.address)
      return hexToInt(b2._hex, 16)/STABLECOIN_PRECISION
    }

    // Define accounts
    const [acc0, acc1, acc2] = await ethers.getSigners();

    // Get Contracts factories
    const ERC20Mock = await ethers.getContractFactory('ERC20Mock')
    const VaultMock = await ethers.getContractFactory('VaultMock')
    const YVaultMarket = await ethers.getContractFactory('YVaultMarket')

    const stablecoin = await ERC20Mock.deploy()
    const vault = await VaultMock.deploy(stablecoin.address)

    // Mint stablecoin
    const mintAmount = 1000 * STABLECOIN_PRECISION
    await stablecoin.mint(acc0, num2str(mintAmount))
    await stablecoin.mint(acc1, num2str(mintAmount))
    await stablecoin.mint(acc2, num2str(mintAmount))

    // Initialize the money market
    const market = await YVaultMarket.deploy(vault.address, stablecoin.address)



  });
});
