//SPDX-License-Identifier: Unlicense
pragma solidity ^0.5.17;

import "hardhat/console.sol";
import "../../mocks/ATokenMock.sol";
import "../../mocks/LendingPoolMock.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract DefirisNAave is ReentrancyGuard {

  // users
  address[] users;

  mapping(address => uint256) balances;
  mapping(address => address) userToAsset;
  mapping(address => address) assetToLendingPool;
  mapping(address => uint256) totalByAsset;

  uint256 totalBalanceOfContract;

  address[] assets;
  address[] lendingPools;
  address[] aTokens;
  uint256[] totalInterestAccruedPerPool;
  uint256 totalInterestAccrued = 0;

  bool withdrawInitiated = false;

    constructor(
        address[] memory _assets, 
        address[] memory _lendingPools,
        address[] memory _aTokens
    ) public 
    {    
        assets = _assets;
        lendingPools = _lendingPools;
        aTokens = _aTokens;
        for(uint256 i = 0; i < _assets.length; i++) {
            assetToLendingPool[_assets[i]] = _lendingPools[i];
        }
    }

    /**
        Public actions
    */

    function deposit(address _asset, uint256 _amount) 
        public
        nonReentrant 
    {
       _deposit(_asset, _amount);
    }


    function withdraw() 
        public 
        nonReentrant 
    {
        _withdraw();
    }


    /**
        Internals
    */
    function _deposit(address _asset, uint256 _amount) internal {
        require(userToAsset[msg.sender] == address(0), "You already have deposited into another pool");

        // First find the lending pool that corresponds to the asset
        address lendingPoolAddress = assetToLendingPool[_asset];
        LendingPoolMock lp = LendingPoolMock(lendingPoolAddress);

        // Then instantiate the token and transfer it to the lending pool
        ERC20 token = ERC20(_asset);
        token.transferFrom(msg.sender, address(this), _amount);
        token.approve(lendingPoolAddress, _amount);
        lp.deposit(_asset, _amount, address(this), 0);

        // Record the user
        users.push(msg.sender);
        userToAsset[msg.sender] = _asset;

        // Book keeping
        balances[msg.sender] = _amount;
        totalBalanceOfContract += _amount;
        totalByAsset[_asset] += _amount;
    }

    // _withdraw withdraw all the interest if not done and split the interest for the different users
    function _withdraw() internal {
        require(balances[msg.sender] > 0, "user has no active balance");
        address user = msg.sender;

        // withdraw interest
        if (!withdrawInitiated) {
           _withdrawInterests();
           withdrawInitiated = true;
        }

        // send the interest for each pool 
        for (uint256 i = 0; i < assets.length; i++) {
            ERC20 token = ERC20(assets[i]);
            token.transfer(user, (totalInterestAccruedPerPool[i]*balances[user])/totalBalanceOfContract);
        }

        // send back the principal
        ERC20 token = ERC20(userToAsset[user]);
        token.transfer(user, balances[user]);

    }

    // _withdrawInterests withdraws the interest from the different lending pool in aave
    function _withdrawInterests() internal {
         for (uint256 i = 0; i < lendingPools.length; i++) {
            ATokenMock aToken = ATokenMock(aTokens[i]);
            LendingPoolMock lp = LendingPoolMock(lendingPools[i]);

            uint256 totalInitialBalanceOfPool = totalByAsset[assets[i]];
            uint256 balanceWithInterest = aToken.balanceOf(address(this));
            
            totalInterestAccrued = balanceWithInterest - totalInitialBalanceOfPool;
            totalInterestAccruedPerPool.push(totalInterestAccrued);
            lp.withdraw(assets[i], balanceWithInterest, address(this));
            }
    }

}
