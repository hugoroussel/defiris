//SPDX-License-Identifier: Unlicense
pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import "hardhat/console.sol";
import "../../mocks/ATokenMock.sol";
import "../../DInterest.sol";
import "../../mocks/LendingPoolMock.sol";
import "../../mocks/CERC20Mock.sol";
import "../../rewards/Vesting.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721Holder.sol";

contract Defiris88mphAaveDCompound is ReentrancyGuard, ERC721Holder {

    mapping(address => address) assetToPool;
    mapping(address => uint256) userToDepositID;
    mapping(address => address) userToAsset;

    uint256 MaturationTime;

    address[] users;

    ERC20 fixedToken;
    ERC20 variableToken;
    ERC20 MPHToken;
    DInterest fixedPool;
    CERC20Mock cToken;
    Vesting vesting;
    address mphminter;

    uint256 totalBalanceOfContract;
    uint256 totalFixed;
    uint256 totalVariable;

    uint256 lastVariableRate;

    mapping(address => uint256) userBalances;

    constructor(
        address _variableAssetAddress,
        address _variableLendingPoolAddress,
        address _fixedAssetAddress,
        address _fixedPoolAddress,
        address _vesting,
        address _mphMinter,
        address _mphToken,
        uint256 _maturationTime
    ) public {
        variableToken = ERC20(_variableAssetAddress);
        cToken = CERC20Mock(_variableLendingPoolAddress);
        fixedToken = ERC20(_fixedAssetAddress);
        fixedPool = DInterest(_fixedPoolAddress);
        vesting = Vesting(_vesting);
        MaturationTime = _maturationTime;
        MPHToken = ERC20(_mphToken);
        mphminter = _mphMinter;
        lastVariableRate = cToken.exchangeRateCurrent();
    }

    function depositFixed(uint256 _amount) public {
        require(userToAsset[msg.sender] == address(0), "user already deposited");
        // First deposit the token into the fixed interest pool
        fixedToken.transferFrom(msg.sender, address(this), _amount);
        fixedToken.approve(address(fixedPool), _amount);
        fixedPool.deposit(_amount, MaturationTime);

        // Perform bookeping
        users.push(msg.sender);
        uint256 depositID = fixedPool.depositsLength();
        userToDepositID[msg.sender] = depositID;
        userBalances[msg.sender] = _amount;
        userToAsset[msg.sender] = address(fixedToken);
        totalFixed += _amount;
        totalBalanceOfContract += _amount;
    }

    function depositVariable(uint256 _amount) public {
        require(userToAsset[msg.sender] == address(0), "user already deposited");

        // First deposit the token into the variable interest pool
        variableToken.transferFrom(msg.sender, address(this), _amount);
        variableToken.approve(address(cToken), _amount);
        cToken.mint(_amount);

        // Perform some book keeping
        users.push(msg.sender);
        userBalances[msg.sender] = _amount;
        userToAsset[msg.sender] = address(variableToken);
        totalBalanceOfContract += _amount;
        totalVariable += _amount;

        lastVariableRate = cToken.exchangeRateStored();
    }

    function withdraw() public { 
        // Withdraw from the fixed pool
        uint totalSupply = MPHToken.totalSupply();
        MPHToken.approve(address(mphminter), totalSupply);
        vesting.withdrawVested(address(this), 0);
        fixedPool.withdraw(1, 0);

        // Book keeping for fixed
        uint256 WithdrawnedFromFixedPool = fixedToken.balanceOf(address(this));
        uint256 TotalInterestGainedFromFixedPool = WithdrawnedFromFixedPool - totalFixed;

        // Withdraw from the variable pool
        uint256 currentRate = cToken.exchangeRateStored();
        cToken.redeemUnderlying((currentRate*totalVariable)/lastVariableRate);

        // Book keeping for variable pool
        uint256 WithdrawnedFromVariablePool = variableToken.balanceOf(address(this));
        uint256 TotalInterestGainedFromVariablePool = WithdrawnedFromVariablePool - totalVariable;

        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            uint256 amountDueFixed = (TotalInterestGainedFromFixedPool*userBalances[user]/totalBalanceOfContract);
            fixedToken.transfer(user, amountDueFixed);

            uint256 amountDueVariable = (TotalInterestGainedFromVariablePool*userBalances[user]/totalBalanceOfContract);
            variableToken.transfer(user, amountDueVariable);

            // withdraw principal from fixed
            if (userToAsset[user] == address(fixedToken)) {
                fixedToken.transfer(user, userBalances[user]);
            }
            
            // withdraw principal from variable
            if (userToAsset[user] == address(variableToken)) {
                variableToken.transfer(user, userBalances[user]);
            }
        }
    }


    


}