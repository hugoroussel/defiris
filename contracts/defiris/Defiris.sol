//SPDX-License-Identifier: Unlicense
pragma solidity ^0.5.17;

import "hardhat/console.sol";
import "../mocks/ATokenMock.sol";
import "../mocks/LendingPoolMock.sol";

contract Defiris {
  mapping(address => address) assetToLendingPool;
  address counterparty1;
  address counterparty2;
  address lendingPool1;
  address lendingPool2;
  address interestToken1;
  address interestToken2;
  address stablecoin1;
  address stablecoin2;

  constructor(
    address _party1,
    address _party2,
    address _stablecoin1, 
    address _stablecoin2,
    address _lendingPool1,
    address _lendingPool2,
    address _interestToken1,
    address _interestToken2
    ) public {
    counterparty1 = _party1;
    counterparty2 = _party2;
    stablecoin1 = _stablecoin1;
    stablecoin2 = _stablecoin2;
    lendingPool1 = _lendingPool1;
    lendingPool2 = _lendingPool2;
    interestToken1 = _interestToken1;
    interestToken2 = _interestToken2;

    assetToLendingPool[_stablecoin1] = _lendingPool1;
    assetToLendingPool[_stablecoin2] = _lendingPool2;
  }

  modifier respectsContract {
    require(msg.sender == counterparty1 || msg.sender == counterparty2, "not a counterparty");
    _;
   }

  function deposit(address _asset, uint256 _amount) public payable respectsContract {
    address lending_pool_address = assetToLendingPool[_asset];
    ERC20 token = ERC20(_asset);
    token.transferFrom(msg.sender, address(this), _amount);
    token.approve(lending_pool_address, _amount);
    LendingPoolMock lp = LendingPoolMock(lending_pool_address);
    lp.deposit(address(_asset), _amount, address(this), 0);
  }


  // withdraw at the end of the period removes for both counterparties
  function withdraw(uint256 amount) public payable respectsContract {

    // 1st get back the accrued interest in both pools
    ATokenMock atoken1 = ATokenMock(interestToken1);
    ATokenMock atoken2 = ATokenMock(interestToken2);
    uint256 balanceWithInterest1 = atoken1.balanceOf(address(this));
    uint256 balanceWithInterest2 = atoken2.balanceOf(address(this));
    console.log(balanceWithInterest1);
    console.log(balanceWithInterest2);

    // 2nd withdraw it
    LendingPoolMock lp1 = LendingPoolMock(lendingPool1);
    LendingPoolMock lp2 = LendingPoolMock(lendingPool2);
    lp1.withdraw(stablecoin1, balanceWithInterest1, address(this));
    lp2.withdraw(stablecoin2, balanceWithInterest2, address(this));

    // 3 send back their due back to everyone

    // 3a init the contracts
    ERC20 token1 = ERC20(stablecoin1);
    ERC20 token2 = ERC20(stablecoin2);

    uint256 principal = amount;

    // 3a send to both counterparties their principal + interest in the other token
    token1.transfer(counterparty1, amount);
    token2.transfer(counterparty1, balanceWithInterest2 - principal);

    token2.transfer(counterparty2, amount);
    token1.transfer(counterparty2, balanceWithInterest1 - principal);

    
    


  }

 
}
