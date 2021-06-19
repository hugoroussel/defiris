//SPDX-License-Identifier: Unlicense
pragma solidity ^0.5.17;

import "hardhat/console.sol";
import "../mocks/ATokenMock.sol";
import "../mocks/LendingPoolMock.sol";

contract Defiris {

  // mapping(address => uint256) balances;

  ERC20 public stablecoin;
  LendingPoolMock public lending_pool;

  constructor(address _stablecoin, address _lendingPool) public {
      stablecoin = ERC20(_stablecoin);
      lending_pool = LendingPoolMock(_lendingPool);
  }
  
  function deposit(uint256 amount) public payable returns (uint256) {
    stablecoin.transferFrom(msg.sender, address(this), amount);
    lending_pool.deposit(address(stablecoin), amount, address(this), 0);
    return stablecoin.allowance(msg.sender, address(this));
  }

}
