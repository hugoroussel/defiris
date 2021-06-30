const { ethers } = require("hardhat");
const BigNumber = require('bignumber.js');

// Constants
const STABLECOIN_PRECISION = 1e6
const MINT_AMOUNT = 1000
const INIT_INTEREST_RATE = 0.1 // 10% APY
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

const epsilon = 1e-4
const INF = BigNumber(2).pow(256).minus(1).toFixed()


// Helpers functions
function hexToInt(hexstring) {
  return parseInt(hexstring, 16);
}

// Converts a JS number into a string that doesn't use scientific notation
function num2str(num) {
return BigNumber(num).integerValue().toFixed()
}

async function passTime(years) {
  const time = Date.now() + YEAR_IN_SEC * years
  await ethers.provider.send('evm_setNextBlockTimestamp', [time]); 
  await ethers.provider.send('evm_mine');
  console.log(years, ' years have passed..')
}

async function main() {

  async function getTokenBalance(token, account) {
    let b2 = await token.balanceOf(account.address)
    return hexToInt(b2._hex, 16)/STABLECOIN_PRECISION
}

async function getBlockTimeStamp(){
  let bNumber = await ethers.provider.getBlockNumber()
  let currentBlock = await ethers.provider.getBlock(hexToInt(bNumber._hex))
  return currentBlock.timestamp
}

    // ================================================================================================================================================================
    // 88mph SETUP
    // ================================================================================================================================================================

    // Setup accounts
    [acc0, acc1, acc2, acc3, acc4] = await ethers.getSigners()

    console.log("Accounts", acc0.address, acc1.address)

    let govTreasury = acc3;
    let devWallet = acc4;

    // Get Contracts factories
    const ERC20Mock = await ethers.getContractFactory('ERC20Mock')
    const ATokenMock = await ethers.getContractFactory('ATokenMock')
    const LendingPoolMock = await ethers.getContractFactory('LendingPoolMock')
    const LendingPoolAddressesProvider = await ethers.getContractFactory('LendingPoolAddressesProviderMock')
    const AaveMarket = await ethers.getContractFactory('AaveMarket')
    const MPHToken = await ethers.getContractFactory('MPHToken')
    const Vesting = await ethers.getContractFactory('Vesting')
    const MPHIssuanceModel = await ethers.getContractFactory('MPHIssuanceModel')
    const MPHMinter = await ethers.getContractFactory('MPHMinter')
    const Rewards = await ethers.getContractFactory('Rewards')
    const NFT = await ethers.getContractFactory('NFT')
    const NFTFactory = await ethers.getContractFactory('NFTFactory')
    const EMAOracle = await ethers.getContractFactory('EMAOracle')
    const PercentageFeeModel = await ethers.getContractFactory('PercentageFeeModel')
    const LinearInterestModel = await ethers.getContractFactory('LinearInterestModel')
    const DInterest = await ethers.getContractFactory('DInterest')

    // Deploy stablecoin and aToken and lending pool contracts
    let stablecoin = await ERC20Mock.deploy()
    console.log('stablecoin 88mph address', stablecoin.address)
    let aToken = await ATokenMock.deploy(stablecoin.address)
    let lendingPool = await LendingPoolMock.deploy()
    await lendingPool.setReserveAToken(stablecoin.address, aToken.address)
    let lendingPoolAddressesProvider = await LendingPoolAddressesProvider.deploy()
    await lendingPoolAddressesProvider.setLendingPoolImpl(lendingPool.address)

    // mint tokens
    const mintAmount = MINT_AMOUNT*STABLECOIN_PRECISION
    await stablecoin.mint(lendingPool.address, mintAmount)
    await stablecoin.mint(acc0.address, mintAmount)

    // Initialize MPH
    let mph = await MPHToken.deploy()
    await mph.init()
    vesting = await Vesting.deploy(mph.address)
    let mphIssuanceModel = await MPHIssuanceModel.deploy(DevRewardMultiplier)
    let mphMinter = await MPHMinter.deploy(mph.address, govTreasury.address, devWallet.address, mphIssuanceModel.address, vesting.address)
    await mph.transferOwnership(mphMinter.address)

    // Set infinite MPH approval
    await mph.approve(mphMinter.address, INF)
    await mph.connect(acc1).approve(mphMinter.address, INF)
    await mph.connect(acc2).approve(mphMinter.address, INF)

    // Initialize MPH rewards
    let rewards = await Rewards.deploy(mph.address, stablecoin.address, Math.floor(Date.now() / 1e3))
    rewards.setRewardDistribution(acc0.address, true)

    // Initialize the money market
    let market = await AaveMarket.deploy(lendingPoolAddressesProvider.address, aToken.address, stablecoin.address)

    // Initialize the NFTs
    const nftTemplate = await NFT.deploy()
    nftFactory = await NFTFactory.deploy(nftTemplate.address)
    const depositNFTReceipt = await nftFactory.createClone('88mph Deposit', '88mph-Deposit')
    const fundingNFTReceipt = await nftFactory.createClone('88mph Funding', '88mph-Funding')
    
    let logs = await ethers.provider.getLogs({
      fromBlock: 0,
      toBlock: "latest",
      address: nftFactory.address
    })
    
   let firstAddress = logs[0].data.replace("0x000000000000000000000000", "0x")
   let secondAddress = logs[1].data.replace("0x000000000000000000000000", "0x")

   depositNFT = await NFT.attach(firstAddress)
   fundingNFT = await NFT.attach(secondAddress)

    // Initialize the interest oracle
    interestOracle = await EMAOracle.deploy(num2str(INIT_INTEREST_RATE * PRECISION / YEAR_IN_SEC), EMAUpdateInterval, EMASmoothingFactor, EMAAverageWindowInIntervals, market.address)

    // Initialize the DInterest pool
    feeModel = await PercentageFeeModel.deploy(rewards.address)
    interestModel = await LinearInterestModel.deploy(num2str(IRMultiplier * PRECISION))
    
    let dInterestPool = await DInterest.deploy(
      {
        MinDepositPeriod,
        MaxDepositPeriod,
        MinDepositAmount,
        MaxDepositAmount
      },
      market.address,
      stablecoin.address,
      feeModel.address,
      interestModel.address,
      interestOracle.address,
      depositNFT.address,
      fundingNFT.address,
      mphMinter.address
    )

    // Set MPH minting multiplier for DInterest pool
    await mphMinter.setPoolWhitelist(dInterestPool.address, true)
    await mphIssuanceModel.setPoolDepositorRewardMintMultiplier(dInterestPool.address, PoolDepositorRewardMintMultiplier)
    await mphIssuanceModel.setPoolDepositorRewardTakeBackMultiplier(dInterestPool.address, PoolDepositorRewardTakeBackMultiplier)
    await mphIssuanceModel.setPoolFunderRewardMultiplier(dInterestPool.address, PoolFunderRewardMultiplier)
    await mphIssuanceModel.setPoolDepositorRewardVestPeriod(dInterestPool.address, PoolDepositorRewardVestPeriod)
    await mphIssuanceModel.setPoolFunderRewardVestPeriod(dInterestPool.address, PoolFunderRewardVestPeriod)

    // Transfer the ownership of the money market to the DInterest pool
    await market.transferOwnership(dInterestPool.address)

    // Transfer NFT ownerships to the DInterest pool
    await depositNFT.transferOwnership(dInterestPool.address)
    await fundingNFT.transferOwnership(dInterestPool.address)


    // ================================================================================================================================================================
    // Compound SETUP
    // ================================================================================================================================================================
    
    // Get Contracts factories
    const CERC20Mock = await ethers.getContractFactory('CERC20Mock')

    // Deploy stablecoin contract
    let stablecoin1 = await ERC20Mock.deploy()
    console.log('stablecoin 1 address', stablecoin1.address)
    
    // Deploy cToken contract (<=> lending pool in aave)
    let cToken = await CERC20Mock.deploy(stablecoin1.address)
    console.log('cToken address', cToken.address)
    
    stablecoin1.mint(acc1.address, mintAmount)
    stablecoin1.mint(cToken.address, mintAmount)

    // ================================================================================================================================================================
    // Defiris SETUP
    // ================================================================================================================================================================

    const DefirisN88mphAaveDCompound = await ethers.getContractFactory('Defiris88mphAaveDCompound')

    let maturation = await getBlockTimeStamp() + MaxDepositPeriod

    let defiris = await DefirisN88mphAaveDCompound.deploy(
            stablecoin1.address,
            cToken.address,
            stablecoin.address,
            dInterestPool.address,
            vesting.address,
            mphMinter.address,
            mph.address,
            maturation
    )
    console.log("defiris address", defiris.address)
    console.log("account 0 stable coin 0 and 1", acc0.address, await getTokenBalance(stablecoin, acc0), await getTokenBalance(stablecoin1, acc0))
    console.log("account 1 stable coin 0 and 1", acc1.address, await getTokenBalance(stablecoin, acc1), await getTokenBalance(stablecoin1, acc1))
 

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
