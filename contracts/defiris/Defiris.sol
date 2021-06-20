//SPDX-License-Identifier: Unlicense
pragma solidity ^0.5.17;

import "hardhat/console.sol";
import "../mocks/ATokenMock.sol";
import "../mocks/LendingPoolMock.sol";

contract Defiris {

  mapping(address => uint256) balances;

  ERC20 public stablecoin1;
  ATokenMock public atoken1;

  ERC20 public stablecoin2;
  ATokenMock public atoken2;

  LendingPoolMock public lending_pool1;
  LendingPoolMock public lending_pool2;

  address public counterparty1;
  address public counterparty2;

  constructor(
      address _stablecoin1,
      address _a_stablecoin1, 
      address _lendingPool1,
      address _stablecoin2,
      address _a_stablecoin2,
      address _lendingPool2
      ) public {
      stablecoin1 = ERC20(_stablecoin1);
      atoken1 = ATokenMock(_a_stablecoin1);
      lending_pool1 = LendingPoolMock(_lendingPool1);

      stablecoin2 = ERC20(_stablecoin2);
      atoken2 = ATokenMock(_a_stablecoin2);
      lending_pool2 = LendingPoolMock(_lendingPool2);
  }


  function depositToken1(uint256 amount) public payable returns (uint256) {
    counterparty1 = msg.sender;
    stablecoin1.transferFrom(msg.sender, address(this), amount);
    stablecoin1.approve(address(lending_pool1), amount);
    lending_pool1.deposit(address(stablecoin1), amount, address(this), 0);
    balances[msg.sender] = amount;
    return stablecoin1.allowance(msg.sender, address(this));
  }

  function depositToken2(uint256 amount) public payable returns (uint256) {
    counterparty2 = msg.sender;
    stablecoin2.transferFrom(msg.sender, address(this), amount);
    stablecoin2.approve(address(lending_pool2), amount);
    lending_pool2.deposit(address(stablecoin2), amount, address(this), 0);
    balances[msg.sender] = amount;
    return stablecoin2.allowance(msg.sender, address(this));
  }

  function withdraw() payable public{
      uint256 balance1 = atoken1.balanceOf(address(this));
      uint256 balance2 = atoken2.balanceOf(address(this));

      console.log("balance 1", balance1);
      console.log("balance 2", balance2);
      
      // hardcoded
      uint256 principal = 1000000000;

      lending_pool1.withdraw(address(stablecoin1), balance1, address(this));
      lending_pool2.withdraw(address(stablecoin2), balance2, address(this));

      stablecoin1.transfer(counterparty1, principal);
      stablecoin2.transfer(counterparty2, principal);

      uint256 rest1 = stablecoin1.balanceOf(address(this));
      uint256 rest2 = stablecoin2.balanceOf(address(this));
      
      stablecoin2.transfer(counterparty1, rest2);
      stablecoin1.transfer(counterparty2, rest1);
  }
  

}
