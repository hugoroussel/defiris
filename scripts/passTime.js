const hre = require("hardhat");
const BigNumber = require('bignumber.js');

// Constants
const STABLECOIN_PRECISION = 1e6
const MINT_AMOUNT = 1000
const INIT_INTEREST_RATE = 0.1 // 5% APY
const YEAR_IN_SEC = 31556952 // Number of seconds in a year
// Constants
const PRECISION = 1e18
const IRMultiplier = 0.75 // Minimum safe avg interest rate multiplier
const MinDepositPeriod = 90 * 24 * 60 * 60 // 90 days in seconds
const MaxDepositPeriod = 3 * YEAR_IN_SEC // 3 years in seconds
const MinDepositAmount = BigNumber(0 * PRECISION).toFixed() // 0 stablecoins
const MaxDepositAmount = BigNumber(1000 * PRECISION).toFixed() // 1000 stablecoins
const PoolDepositorRewardMintMultiplier = BigNumber(3.168873e-13 * PRECISION * (PRECISION / STABLECOIN_PRECISION)).toFixed() // 1e5 stablecoin * 1 year => 1 MPH
const PoolDepositorRewardTakeBackMultiplier = BigNumber(0.9 * PRECISION).toFixed()
const PoolFunderRewardMultiplier = BigNumber(3.168873e-13 * PRECISION * (PRECISION / STABLECOIN_PRECISION)).toFixed() // 1e5 stablecoin * 1 year => 1 MPH
const DevRewardMultiplier = BigNumber(0.1 * PRECISION).toFixed()
const EMAUpdateInterval = 24 * 60 * 60
const EMASmoothingFactor = BigNumber(2 * PRECISION).toFixed()
const EMAAverageWindowInIntervals = 30
const PoolDepositorRewardVestPeriod = 7 * 24 * 60 * 60 // 7 days
const PoolFunderRewardVestPeriod = 0 * 24 * 60 * 60 // 0 days




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

// Helpers functions
function hexToInt(hexstring) {
  return parseInt(hexstring, 16);
}

async function main() {

  const CTOKEN = '0x851356ae760d987E095750cCeb3bC6014560891C'
  const ATOKEN = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'

  const ATokenMock = await ethers.getContractFactory('ATokenMock')
  const CERC20Mock = await ethers.getContractFactory('CERC20Mock')


  const aToken = await ATokenMock.attach(ATOKEN)
  const cToken = await CERC20Mock.attach(CTOKEN)

  
  // .. All of this needs to be done during the time pass
  await passTime(3)
  
  // set rate aave
  await aToken.mintInterest(num2str(YEAR_IN_SEC*3))

   
  // set rate compound
  const currentExRate = await cToken.exchangeRateStored();
  const rateAfterTimePasses = currentExRate *(1 + 3 * INIT_INTEREST_RATE)
  console.log('rateAfterTimePasses', rateAfterTimePasses)
  await cToken._setExchangeRateStored(rateAfterTimePasses)
  // until here ...


}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
