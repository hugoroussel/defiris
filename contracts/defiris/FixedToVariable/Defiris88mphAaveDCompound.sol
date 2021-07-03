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

    bool withdrawalInitiated = false;

    uint256 MaturationTime;

    uint256[] depositIDs;

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

    uint256 TotalInterestGainedFromFixedPool;
    uint256 TotalInterestGainedFromVariablePool;

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

    /**
        Public actions
    */

    function depositFixed(uint256 _amount)
        public
        nonReentrant 
    {
        _depositFixed(_amount);
    }

    function depositVariable(uint256 _amount )
        public
        nonReentrant 
    {
        _depositVariable(_amount);
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
    // deposits into the fixed pool strategy
    function _depositFixed(uint256 _amount) internal {
        require(userToAsset[msg.sender] == address(0), "user already deposited");

        // First deposit the token into the fixed interest pool
        fixedToken.transferFrom(msg.sender, address(this), _amount);
        fixedToken.approve(address(fixedPool), _amount);
        fixedPool.deposit(_amount, MaturationTime);

        // Perform bookeping
        uint256 depositID = fixedPool.depositsLength();
        depositIDs.push(depositID);
        userToDepositID[msg.sender] = depositID;

        userBalances[msg.sender] = _amount;
        userToAsset[msg.sender] = address(fixedToken);
        totalFixed += _amount;
        totalBalanceOfContract += _amount;
    }

    // deposits into the variable pools strategies
    function _depositVariable(uint256 _amount) internal{
        require(userToAsset[msg.sender] == address(0), "user already deposited");

        // First deposit the token into the variable interest pool
        variableToken.transferFrom(msg.sender, address(this), _amount);
        variableToken.approve(address(cToken), _amount);
        cToken.mint(_amount);

        // Perform some book keeping
        userBalances[msg.sender] = _amount;
        userToAsset[msg.sender] = address(variableToken);
        totalBalanceOfContract += _amount;
        totalVariable += _amount;

        lastVariableRate = cToken.exchangeRateStored();
    }

    // withdraw 
    function _withdraw() internal { 
        address user = msg.sender;
        require(userBalances[user] > 0, "user did not deposit");

        // The first user initiating the withdrawal will initiate withdrawal from the different pools
        if (!withdrawalInitiated) {
           _initiateWithdrawal();
            withdrawalInitiated = true;
        }

        // Compute and send the amount due for the fixed interest rate
        uint256 amountDueFixed = (TotalInterestGainedFromFixedPool*userBalances[user]/totalBalanceOfContract);
        fixedToken.transfer(user, amountDueFixed);

        // Compute and send the amount due for the variable interest rate
        uint256 amountDueVariable = (TotalInterestGainedFromVariablePool*userBalances[user]/totalBalanceOfContract);
        variableToken.transfer(user, amountDueVariable);

        // Send back withdrawal principal
        ERC20 principalToken = ERC20(userToAsset[user]);
        principalToken.transfer(user, userBalances[user]);

        // Update user balance
        userBalances[user] = 0;
    }

    // _initiateWithdrawal withdraws the interest from the different lending pool of 88mph and Compound
    // TODO : add support for coupons IDs
    function _initiateWithdrawal() internal {
        // Withdraw from the fixed pool
        MPHToken.approve(address(mphminter), MPHToken.totalSupply());

        // TODO : add the coupon bonds ids here
        vesting.withdrawVested(address(this), 0);

        // Withdraw from the fixed pool for the different deposit ids
        for(uint256 i = 0; i < depositIDs.length; i++) {
            fixedPool.withdraw(depositIDs[i], 0);
        }

        // Book keeping for fixed
        TotalInterestGainedFromFixedPool = fixedToken.balanceOf(address(this)) - totalFixed;

        // Withdraw from the variable pool
        cToken.redeemUnderlying((cToken.exchangeRateStored()*totalVariable)/lastVariableRate);

        // Book keeping for variable pool
        TotalInterestGainedFromVariablePool = variableToken.balanceOf(address(this)) - totalVariable;
    }

}