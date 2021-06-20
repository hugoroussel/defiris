//SPDX-License-Identifier: Unlicense
pragma solidity ^0.5.17;

import "hardhat/console.sol";
import "../mocks/ATokenMock.sol";
import "../mocks/LendingPoolMock.sol";

contract Defiris1 {


  mapping(address => address) assetToLendingPool;

  address[] users;
  address lendingPool1;
  address lendingPool2;
  address interestToken1;
  address interestToken2;
  address stablecoin1;
  address stablecoin2;

  uint256 totalToken1;
  uint256 totalToken2;
  uint256 totalBalanceOfContract;

  mapping(address => uint256) balances;
  mapping(address => address) userToAsset;

  constructor(
    address _stablecoin1, 
    address _stablecoin2,
    address _lendingPool1,
    address _lendingPool2,
    address _interestToken1,
    address _interestToken2
    ) public {
    stablecoin1 = _stablecoin1;
    stablecoin2 = _stablecoin2;
    lendingPool1 = _lendingPool1;
    lendingPool2 = _lendingPool2;
    interestToken1 = _interestToken1;
    interestToken2 = _interestToken2;
  }

  function depositToken1(address _asset, uint256 _amount) public payable {

    require(_asset == stablecoin1, "wrong asset deposited!");

    // TODO : security : check that the user was not here before using a mapping to avoid duplicates
    users.push(msg.sender);
    
    
    ERC20 token = ERC20(_asset);
    token.transferFrom(msg.sender, address(this), _amount);

    token.approve(lendingPool1, _amount);

    LendingPoolMock lp = LendingPoolMock(lendingPool1);
    lp.deposit(address(_asset), _amount, address(this), 0);
    balances[msg.sender] = _amount;
    userToAsset[msg.sender] = stablecoin1;
    totalBalanceOfContract = totalBalanceOfContract + _amount;
    totalToken1 = totalToken1 + _amount;
  }

  function depositToken2(address _asset, uint256 _amount) public payable {

    require(_asset == stablecoin2, "wrong asset deposited!");

    // TODO : security : check that the user was not here before using a mapping to avoid duplicates
    users.push(msg.sender);
    
    ERC20 token = ERC20(_asset);
    token.transferFrom(msg.sender, address(this), _amount);
    token.approve(lendingPool2, _amount);

    LendingPoolMock lp = LendingPoolMock(lendingPool2);
    lp.deposit(address(_asset), _amount, address(this), 0);

    balances[msg.sender] = _amount;
    userToAsset[msg.sender] = stablecoin2;

    totalBalanceOfContract = totalBalanceOfContract + _amount;
    totalToken2 = totalToken2 + _amount;
  }

  // withdraw at the end of the period removes for both counterparties
  function withdraw() public payable {

    // 1st get back the accrued interest in both pools
    ATokenMock atoken1 = ATokenMock(interestToken1);
    ATokenMock atoken2 = ATokenMock(interestToken2);
    uint256 balanceWithInterest1 = atoken1.balanceOf(address(this));
    uint256 balanceWithInterest2 = atoken2.balanceOf(address(this));


    uint256 TotalInterestForToken1 = balanceWithInterest1 - totalToken1; 
    uint256 TotalInterestForToken2 = balanceWithInterest2 - totalToken2;

    // 2nd withdraw it
    LendingPoolMock lp1 = LendingPoolMock(lendingPool1);
    LendingPoolMock lp2 = LendingPoolMock(lendingPool2);

    lp1.withdraw(stablecoin1, balanceWithInterest1, address(this));
    lp2.withdraw(stablecoin2, balanceWithInterest2, address(this));

    // 3 send back their due back to everyone

    // 3a init the contracts
    ERC20 token1 = ERC20(stablecoin1);
    ERC20 token2 = ERC20(stablecoin2);


    for (uint256 i = 0; i < users.length; i++) {
      address user = users[i];
      uint256 amountDueStableCoin1 = (TotalInterestForToken1 * balances[user]/totalBalanceOfContract);
      uint256 amountDueStableCoin2 = (TotalInterestForToken2 * balances[user]/totalBalanceOfContract);

      console.log("index", i);
      console.log("balance user deposited", balances[user]);
      console.log("totalBalance of contract", totalBalanceOfContract);


      token1.transfer(user, amountDueStableCoin1);
      token2.transfer(user, amountDueStableCoin2);
      // what about the principal ???
      ERC20 tokenPrincipal = ERC20(userToAsset[user]);
      tokenPrincipal.transfer(user, balances[user]);
    }

  }
}
