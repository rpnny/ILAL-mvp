// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "../../src/core/Registry.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract RegistryTest is Test {
    Registry public registry;
    Registry public implementation;

    address public owner = makeAddr("owner");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    // Issuer 相关
    bytes32 public constant COINBASE_ID = keccak256("Coinbase");
    address public coinbaseAttester = makeAddr("coinbaseAttester");
    address public coinbaseVerifier = makeAddr("coinbaseVerifier");

    // Router 相关
    address public universalRouter = makeAddr("universalRouter");

    function setUp() public {
        // 部署实现合约
        implementation = new Registry();

        // 部署代理并初始化
        bytes memory initData = abi.encodeWithSelector(
            Registry.initialize.selector,
            owner
        );

        ERC1967Proxy proxy = new ERC1967Proxy(
            address(implementation),
            initData
        );

        registry = Registry(address(proxy));
    }

    // ============ 初始化测试 ============

    function test_Initialize() public view {
        assertEq(registry.getSessionTTL(), 24 hours);
        assertEq(registry.emergencyPaused(), false);
        assertEq(registry.owner(), owner);
    }

    function testFail_InitializeTwice() public {
        registry.initialize(owner);
    }

    // ============ Issuer 管理测试 ============

    function test_RegisterIssuer() public {
        vm.prank(owner);
        registry.registerIssuer(COINBASE_ID, coinbaseAttester, coinbaseVerifier);

        IRegistry.IssuerInfo memory info = registry.getIssuerInfo(COINBASE_ID);
        assertEq(info.attester, coinbaseAttester);
        assertEq(info.verifier, coinbaseVerifier);
        assertTrue(info.active);
    }

    function test_RegisterIssuer_Event() public {
        vm.expectEmit(true, true, true, true);
        emit IRegistry.IssuerRegistered(COINBASE_ID, coinbaseAttester, coinbaseVerifier);

        vm.prank(owner);
        registry.registerIssuer(COINBASE_ID, coinbaseAttester, coinbaseVerifier);
    }

    function testFail_RegisterIssuer_NotOwner() public {
        vm.prank(alice);
        registry.registerIssuer(COINBASE_ID, coinbaseAttester, coinbaseVerifier);
    }

    function testFail_RegisterIssuer_ZeroAddress() public {
        vm.prank(owner);
        registry.registerIssuer(COINBASE_ID, address(0), coinbaseVerifier);
    }

    function testFail_RegisterIssuer_Duplicate() public {
        vm.startPrank(owner);
        registry.registerIssuer(COINBASE_ID, coinbaseAttester, coinbaseVerifier);
        registry.registerIssuer(COINBASE_ID, coinbaseAttester, coinbaseVerifier);
        vm.stopPrank();
    }

    function test_UpdateIssuer() public {
        vm.startPrank(owner);
        registry.registerIssuer(COINBASE_ID, coinbaseAttester, coinbaseVerifier);

        address newVerifier = makeAddr("newVerifier");
        registry.updateIssuer(COINBASE_ID, newVerifier);
        vm.stopPrank();

        IRegistry.IssuerInfo memory info = registry.getIssuerInfo(COINBASE_ID);
        assertEq(info.verifier, newVerifier);
    }

    function test_RevokeIssuer() public {
        vm.startPrank(owner);
        registry.registerIssuer(COINBASE_ID, coinbaseAttester, coinbaseVerifier);
        registry.revokeIssuer(COINBASE_ID);
        vm.stopPrank();

        IRegistry.IssuerInfo memory info = registry.getIssuerInfo(COINBASE_ID);
        assertFalse(info.active);
    }

    function test_IsIssuerActive() public {
        vm.prank(owner);
        registry.registerIssuer(COINBASE_ID, coinbaseAttester, coinbaseVerifier);

        assertTrue(registry.isIssuerActive(coinbaseAttester));
    }

    // ============ 路由器管理测试 ============

    function test_ApproveRouter() public {
        vm.prank(owner);
        registry.approveRouter(universalRouter, true);

        assertTrue(registry.isRouterApproved(universalRouter));
    }

    function test_ApproveRouter_Event() public {
        vm.expectEmit(true, true, true, true);
        emit IRegistry.RouterApproved(universalRouter, true);

        vm.prank(owner);
        registry.approveRouter(universalRouter, true);
    }

    function test_DisapproveRouter() public {
        vm.startPrank(owner);
        registry.approveRouter(universalRouter, true);
        registry.approveRouter(universalRouter, false);
        vm.stopPrank();

        assertFalse(registry.isRouterApproved(universalRouter));
    }

    // ============ 参数管理测试 ============

    function test_SetSessionTTL() public {
        vm.prank(owner);
        registry.setSessionTTL(12 hours);

        assertEq(registry.getSessionTTL(), 12 hours);
    }

    function testFail_SetSessionTTL_TooSmall() public {
        vm.prank(owner);
        registry.setSessionTTL(30 minutes);
    }

    function testFail_SetSessionTTL_TooLarge() public {
        vm.prank(owner);
        registry.setSessionTTL(8 days);
    }

    // ============ 紧急控制测试 ============

    function test_EmergencyPause() public {
        vm.prank(owner);
        registry.setEmergencyPause(true);

        assertTrue(registry.emergencyPaused());
    }

    function test_EmergencyUnpause() public {
        vm.startPrank(owner);
        registry.setEmergencyPause(true);
        registry.setEmergencyPause(false);
        vm.stopPrank();

        assertFalse(registry.emergencyPaused());
    }

    // ============ 升级测试 ============

    function test_UpgradeToNewImplementation() public {
        Registry newImplementation = new Registry();

        vm.prank(owner);
        registry.upgradeToAndCall(address(newImplementation), "");

        // 验证升级后数据保留
        assertEq(registry.owner(), owner);
    }

    function testFail_UpgradeByNonOwner() public {
        Registry newImplementation = new Registry();

        vm.prank(alice);
        registry.upgradeToAndCall(address(newImplementation), "");
    }

    // ============ 版本测试 ============

    function test_Version() public view {
        assertEq(registry.version(), "1.0.0");
    }
}
