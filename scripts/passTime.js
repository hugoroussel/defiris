const hre = require("hardhat");

MINT_AMOUNT = 1000
const STABLECOIN_PRECISION = 1e6
const YEAR_IN_SEC = 31556952 // Number of seconds in a year



async function passTime(years) {
    const time = Date.now() + YEAR_IN_SEC * years
    await ethers.provider.send('evm_setNextBlockTimestamp', [time]); 
    await ethers.provider.send('evm_mine');
    console.log(years, ' years have passed..')
}
  

async function main() {
  await passTime(3)

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
