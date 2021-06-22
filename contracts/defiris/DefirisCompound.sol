//SPDX-License-Identifier: Unlicense
pragma solidity ^0.5.17;

import "hardhat/console.sol";
import "../mocks/ATokenMock.sol";
import "../mocks/CERC20Mock.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract DefirisCompound is ReentrancyGuard {

  mapping(address => address) assetToLendingPool;

  // users
  address[] users;

  // lending pools, interest tokens..
  address cToken1;
  address cToken2;
  address stablecoin1;
  address stablecoin2;

  // bookkeeping
  uint256 totalToken1;
  uint256 totalToken2;
  uint256 totalBalanceOfContract;
  uint256 lastRate1;
  uint256 lastRate2;
  mapping(address => uint256) balances;
  mapping(address => address) userToAsset;

  uint endOfDepositTime;
  uint endOfLockingPeriod;

  constructor(
    uint depositPeriodInDays,
    uint lockingPeriodInDays,
    address _stablecoin1, 
    address _stablecoin2,
    address _lendingPool1,
    address _lendingPool2
    ) public {
    stablecoin1 = _stablecoin1;
    stablecoin2 = _stablecoin2;
    cToken1 = _lendingPool1;
    cToken2 = _lendingPool2;
    endOfDepositTime = now + depositPeriodInDays * 1 days;
    endOfLockingPeriod = now + lockingPeriodInDays * 1 days;
  }

  // function only callable before the lock period starts
  function depositToken1(address _asset, uint256 _amount) public payable nonReentrant {
    // Perform checks
    require(now <= endOfDepositTime, "the deposit time has ended");
    require(_asset == stablecoin1, "wrong asset deposited!");

    // Register the user
    users.push(msg.sender);
    
    // Transfer user funds to contract and approve transfer to other token
    ERC20 token = ERC20(_asset);
    token.transferFrom(msg.sender, address(this), _amount);
    token.approve(cToken1, _amount);

    // Mint interest bearing tokens
    CERC20Mock cToken = CERC20Mock(cToken1);
    cToken.mint(_amount);

    // record the rate for later
    lastRate1 = cToken.exchangeRateStored();
    console.log('recording rate for token1', lastRate1);

    // Bookkeeping
    balances[msg.sender] = _amount;
    userToAsset[msg.sender] = stablecoin1;
    totalBalanceOfContract = totalBalanceOfContract + _amount;
    totalToken1 = totalToken1 + _amount;
  }

  function depositToken2(address _asset, uint256 _amount) public payable nonReentrant {
    // Perform checks
    require(now <= endOfDepositTime, "the deposit time has ended");
    require(_asset == stablecoin2, "wrong asset deposited!");

    // Register the user
    users.push(msg.sender);
    
    // Transfer user funds to contract and approve transfer to other token
    ERC20 token = ERC20(_asset);
    token.transferFrom(msg.sender, address(this), _amount);
    token.approve(cToken2, _amount);

    // Mint interest bearing tokens
    CERC20Mock cToken = CERC20Mock(cToken2);
    cToken.mint(_amount);

    // record the rate for later
    lastRate2 = cToken.exchangeRateStored();
    console.log('recording rate for token2', lastRate2);

    // Book keeping
    balances[msg.sender] = _amount;
    userToAsset[msg.sender] = stablecoin2;
    totalBalanceOfContract = totalBalanceOfContract + _amount;
    totalToken2 = totalToken2 + _amount;
  }

  // withdraw at the end of the period removes for all counterparties
  function withdraw() public payable {

    // 1st get back the accrued interest in both pools
    CERC20Mock cToken1 = CERC20Mock(cToken1);
    CERC20Mock cToken2 = CERC20Mock(cToken2);
    uint256 currentRate1 = cToken1.exchangeRateStored();
    uint256 currentRate2 = cToken2.exchangeRateStored();

    cToken1.redeemUnderlying((currentRate1*totalToken1)/lastRate1);
    cToken2.redeemUnderlying((currentRate2*totalToken2)/lastRate2);

    // Init the stablecoin tokens
    ERC20 token1 = ERC20(stablecoin1);
    ERC20 token2 = ERC20(stablecoin2);

    uint256 withInterest1 = token1.balanceOf(address(this));
    uint256 withInterest2 = token2.balanceOf(address(this));

    uint256 totalInterestToken1 = withInterest1 - totalToken1;
    uint256 totalInterestToken2 = withInterest2 - totalToken2;

    for (uint256 i = 0; i < users.length; i++) {
        address user = users[i];
        uint256 amountDueStableCoin1 = (totalInterestToken1 * balances[user]/totalBalanceOfContract);
        uint256 amountDueStableCoin2 = (totalInterestToken2 * balances[user]/totalBalanceOfContract);

        // send the interests
        token1.transfer(user, amountDueStableCoin1);
        token2.transfer(user, amountDueStableCoin2);

        // send the principal
        ERC20 tokenPrincipal = ERC20(userToAsset[user]);
        tokenPrincipal.transfer(user, balances[user]);
    }
  }

}
