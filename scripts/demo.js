// const { ethers } = require("ethers");
const { ethers } = require("hardhat");


MINT_AMOUNT = 1000
const STABLECOIN_PRECISION = 1e6

async function main() {
  const ERC20Mock = await ethers.getContractFactory('ERC20Mock')
  const erc20 = await ERC20Mock.deploy()
  const [acc0, acc1, acc2] = await ethers.getSigners();

  await erc20.mint(acc0.address, MINT_AMOUNT*STABLECOIN_PRECISION)
 

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
