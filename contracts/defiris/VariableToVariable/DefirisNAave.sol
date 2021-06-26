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
  mapping(address => address) lendingPoolToAsset;
  mapping(address => uint256) totalByAsset;
  mapping(address => uint256) rates;
  mapping(address => bool) isUser;

  uint256 totalBalanceOfContract;

  address[] assets;
  address[] lendingPools;
  address[] aTokens;

  constructor(
    address[] memory _assets, 
    address[] memory _lendingPools,
    address[] memory _aTokens
    ) public {    
        assets = _assets;
        lendingPools = _lendingPools;
        aTokens = _aTokens;
        for(uint256 i = 0; i < _assets.length; i++) {
            address asset = _assets[i];
            address lp = _lendingPools[i];
            assetToLendingPool[asset] = lp;
            lendingPoolToAsset[lp] = asset;
        }
    }

    function deposit(address _asset, uint256 _amount) public nonReentrant {
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


    function withdraw() public {


        for (uint256 i = 0; i < lendingPools.length; i++) {
            address lendingPoolAddress = lendingPools[i];
            address asset = assets[i];
            address aTokenAddress = aTokens[i];

            ATokenMock aToken = ATokenMock(aTokenAddress);
            LendingPoolMock lp = LendingPoolMock(lendingPoolAddress);
            ERC20 token = ERC20(asset);

            uint256 totalInitialBalanceOfPool = totalByAsset[asset];
            uint256 balanceWithInterest = aToken.balanceOf(address(this));
            
            uint256 totalInterestAccrued = balanceWithInterest - totalInitialBalanceOfPool;
            lp.withdraw(asset, balanceWithInterest, address(this));
            
            for (uint256 i = 0; i < users.length; i++) {
                address user = users[i];
                console.log((totalInterestAccrued*balances[user])/totalBalanceOfContract);
                token.transfer(user, (totalInterestAccrued*balances[user])/totalBalanceOfContract);
            }
        }

        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            ERC20 token = ERC20(userToAsset[user]);
            token.transfer(user, balances[user]);
        }

    }

}
