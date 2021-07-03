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
  mapping(address => uint256) totalByAsset;
  mapping(address => uint256) rates;

  bool withdrawInitiated = false;
  uint256 totalBalanceOfContract;
  address[] assets;
  address[] lendingPools;
  uint256[] totalInterestAccruedPerPool;


  constructor(
    address[] memory _assets, 
    address[] memory _lendingPools
    ) public {    
        assets = _assets;
        lendingPools = _lendingPools;
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
    
    // _withdraw 
    // withdraws from all the pools if not done
    // gives the interest to the user
    // sends back the principal
    function _withdraw() internal {
        require(balances[msg.sender] > 0, "user has no active balance");

        // withdraw interest
        if (!withdrawInitiated){
            _initiateWithdrawal();
            withdrawInitiated = true;
        }

        address user = msg.sender;

        // send the interest for each pool at the pro rata of the total pool
        for (uint256 i = 0; i < assets.length; i++) {
            uint256 amountDue = (totalInterestAccruedPerPool[i]*balances[user]/totalBalanceOfContract);
            ERC20 token = ERC20(assets[i]);
            token.transfer(user, amountDue);
        }
        
        // send back the principal
        ERC20 token = ERC20(userToAsset[user]);
        token.transfer(user, balances[user]);
    }

    // _initiateWithdrawal withdraws the interest from the different lending pool in compound
    function _initiateWithdrawal() internal {
        for (uint256 i = 0; i < lendingPools.length; i++) {
            CERC20Mock cToken = CERC20Mock(lendingPools[i]);
            ERC20 token = ERC20(assets[i]);
            cToken.redeemUnderlying((cToken.exchangeRateStored()*totalByAsset[assets[i]])/rates[assets[i]]);
            totalInterestAccruedPerPool.push(token.balanceOf(address(this)) - totalByAsset[assets[i]]);
        }
    }
}
