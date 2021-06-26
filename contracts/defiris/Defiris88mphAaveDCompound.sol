//SPDX-License-Identifier: Unlicense
pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import "hardhat/console.sol";
import "../mocks/ATokenMock.sol";
import "../DInterest.sol";
import "../mocks/LendingPoolMock.sol";
import "../mocks/CERC20Mock.sol";
import "../rewards/Vesting.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721Holder.sol";
import "hardhat/console.sol";

contract DefirisN88mphAaveDCompound is ReentrancyGuard, ERC721Holder {

    mapping(address => address) assetToPool;
    mapping(address => uint256) userToDepositID;

    uint256 MaturationTime;

    ERC20 fixedToken;
    ERC20 variableToken;
    ERC20 MPHToken;
    DInterest fixedPool;
    CERC20Mock cToken;
    Vesting vesting;
    address mphminter;

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
    }

    function depositFixed(uint256 _amount) public {
        fixedToken.transferFrom(msg.sender, address(this), _amount);
        fixedToken.approve(address(fixedPool), _amount);
        fixedPool.deposit(_amount, MaturationTime);
        uint256 depositID = fixedPool.depositsLength();
        console.log("deposit id", depositID);
        userToDepositID[msg.sender] = depositID;
    }

    function depositVariable(uint256 _amount) public {
        variableToken.transferFrom(msg.sender, address(this), _amount);
        variableToken.approve(address(cToken), _amount);
        cToken.mint(_amount);
    }

    function withdraw(uint256 _mintAmount) public { 
        uint totalSupply = MPHToken.totalSupply();
        MPHToken.approve(address(mphminter), totalSupply);
        vesting.withdrawVested(address(this), 0);
        fixedPool.withdraw(1, 0);

        uint256 tb = fixedToken.balanceOf(address(this));
        console.log("balance of contract", tb);
    }


    


}