//SPDX-License-Identifier: Unlicense
pragma solidity ^0.5.17;

import "hardhat/console.sol";
import "../../mocks/CERC20Mock.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract DefirisNCompound is ReentrancyGuard {

  // users
  address[] users;

  mapping(address => uint256) balances;
  mapping(address => address) userToAsset;
  mapping(address => address) assetToLendingPool;
  mapping(address => address) lendingPoolToAsset;
  mapping(address => uint256) totalByAsset;
  mapping(address => uint256) rates;

  uint256 totalBalanceOfContract;

  address[] assets;
  address[] lendingPools;

  constructor(
    address[] memory _assets, 
    address[] memory _lendingPools
    ) public {    
        assets = _assets;
        lendingPools = _lendingPools;
        for(uint256 i = 0; i < _assets.length; i++) {
            address asset = _assets[i];
            address lp = _lendingPools[i];
            assetToLendingPool[asset] = lp;
            lendingPoolToAsset[lp] = asset;
        }
    }

    function deposit(address _asset, uint256 _amount) public nonReentrant {
        // First deposit the user asset into the given strategy
        require(userToAsset[msg.sender] == address(0), "You already have deposited into another pool");
        address lendingPoolAddress = assetToLendingPool[_asset];
        CERC20Mock cToken = CERC20Mock(lendingPoolAddress);

        ERC20 token = ERC20(_asset);
        console.log("stablecoin", _asset);
        token.transferFrom(msg.sender, address(this), _amount);
        token.approve(lendingPoolAddress, _amount);

        cToken.mint(_amount);

        // Register the user
        users.push(msg.sender);
        userToAsset[msg.sender] = _asset;

        // Book keeping
        rates[_asset] = cToken.exchangeRateStored();
        balances[msg.sender] = _amount;
        totalBalanceOfContract += _amount;
        totalByAsset[_asset] += _amount;
    }

    function withdraw() public nonReentrant {

        for (uint256 i = 0; i < lendingPools.length; i++) {
            address lendingPoolAddress = lendingPools[i];
            address asset = assets[i];
            CERC20Mock cToken = CERC20Mock(lendingPoolAddress);
            ERC20 token = ERC20(asset);
            uint256 currentRate = cToken.exchangeRateStored();
            uint256 oldRate = rates[asset];
            uint256 totalAsset = totalByAsset[asset];
            console.log(currentRate, oldRate, totalAsset);
            cToken.redeemUnderlying((currentRate*totalAsset)/oldRate);
            uint256 totalWithInterest = token.balanceOf(address(this));
            uint256 interestOnly = totalWithInterest - totalAsset;
            for (uint256 i = 0; i < users.length; i++) {
                address user = users[i];
                uint256 amountDue = (interestOnly*balances[user]/totalBalanceOfContract);
                token.transfer(user, amountDue);
            }
        }

        for (uint256 i = 0; i < users.length; i++) {
                address user = users[i];
                ERC20 token = ERC20(userToAsset[user]);
                token.transfer(user, balances[user]);
        }



        

    }



}
