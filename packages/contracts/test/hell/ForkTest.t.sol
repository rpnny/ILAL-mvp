// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "../../src/core/ComplianceHook.sol";
import "../../src/core/Registry.sol";
import "../../src/core/SessionManager.sol";
import "../../src/core/VerifiedPoolsPositionManager.sol";
import "../../src/helpers/SimpleSwapRouter.sol";

/**
 * @title ForkTest
 * @notice Base Sepolia Fork 测试 - 验证已部署合约的状态和集成
 * 
 * 运行方式:
 *   forge test --fork-url https://sepolia.base.org --match-contract ForkTest -vvv
 */
contract ForkTest is Test {
    // ============ 已部署的合约地址 (Base Sepolia) ============
    
    address constant REGISTRY = 0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD;
    address constant SESSION_MANAGER = 0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2;
    address constant COMPLIANCE_HOOK = 0xDeDcFDF10b03AB45eEbefD2D91EDE66D9E5c8a80;
    address constant POSITION_MANAGER = 0x5b460c8Bd32951183a721bdaa3043495D8861f31;
    address constant SIMPLE_SWAP_ROUTER = 0x2AAF6C551168DCF22804c04DdA2c08c82031F289;
    address constant UNISWAP_V4_POOL_MANAGER = 0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408;

    // 合约接口
    Registry public registry;
    SessionManager public sessionManager;
    ComplianceHook public hook;
    VerifiedPoolsPositionManager public positionManager;
    SimpleSwapRouter public swapRouter;

    function setUp() public {
        // 检查是否在 Base Sepolia Fork 环境
        if (block.chainid != 84532) {
            // 非 fork 环境跳过
            return;
        }

        registry = Registry(REGISTRY);
        sessionManager = SessionManager(SESSION_MANAGER);
        hook = ComplianceHook(COMPLIANCE_HOOK);
        positionManager = VerifiedPoolsPositionManager(payable(POSITION_MANAGER));
        swapRouter = SimpleSwapRouter(payable(SIMPLE_SWAP_ROUTER));
    }

    modifier onlyFork() {
        if (block.chainid != 84532) {
            console.log("SKIP: Not Base Sepolia fork - run with --fork-url https://sepolia.base.org");
            return;
        }
        _;
    }

    // ============================================
    // TEST: 验证合约部署状态
    // ============================================

    function test_Fork_ContractsDeployed() public onlyFork {
        // 验证所有合约都有代码
        assertTrue(_hasCode(REGISTRY), "Registry not deployed");
        assertTrue(_hasCode(SESSION_MANAGER), "SessionManager not deployed");
        assertTrue(_hasCode(COMPLIANCE_HOOK), "ComplianceHook not deployed");
        assertTrue(_hasCode(POSITION_MANAGER), "PositionManager not deployed");
        assertTrue(_hasCode(SIMPLE_SWAP_ROUTER), "SimpleSwapRouter not deployed");
        assertTrue(_hasCode(UNISWAP_V4_POOL_MANAGER), "Uniswap V4 PoolManager not deployed");

        console.log("All 6 contracts verified on Base Sepolia");
    }

    function test_Fork_ContractLinkages() public onlyFork {
        // 验证合约间的引用正确
        assertEq(address(hook.registry()), REGISTRY, "Hook->Registry mismatch");
        assertEq(address(hook.sessionManager()), SESSION_MANAGER, "Hook->SessionManager mismatch");
        assertEq(address(positionManager.poolManager()), UNISWAP_V4_POOL_MANAGER, "PM->PoolManager mismatch");
        assertEq(address(positionManager.registry()), REGISTRY, "PM->Registry mismatch");
        assertEq(address(positionManager.sessionManager()), SESSION_MANAGER, "PM->SessionManager mismatch");
        assertEq(address(swapRouter.poolManager()), UNISWAP_V4_POOL_MANAGER, "Router->PoolManager mismatch");

        console.log("All contract linkages verified");
    }

    // ============================================
    // TEST: Registry 状态
    // ============================================

    function test_Fork_RegistryState() public onlyFork {
        // 检查紧急暂停状态
        bool paused = registry.emergencyPaused();
        console.log("Registry emergency paused:", paused);
        assertFalse(paused, "Registry should not be paused");
    }

    // ============================================
    // TEST: SessionManager 状态
    // ============================================

    function test_Fork_SessionManagerState() public onlyFork {
        // 检查一个随机地址是否有 Session（不应该有）
        address randomUser = makeAddr("random_user_test");
        bool active = sessionManager.isSessionActive(randomUser);
        assertFalse(active, "Random user should not have active session");

        console.log("SessionManager state verified");
    }

    // ============================================
    // TEST: PositionManager 状态
    // ============================================

    function test_Fork_PositionManagerState() public onlyFork {
        uint256 nextTokenId = positionManager.nextTokenId();
        console.log("Next Token ID:", nextTokenId);
        assertTrue(nextTokenId >= 1, "Next token ID should be >= 1");
    }

    // ============================================
    // TEST: SimpleSwapRouter 基本功能
    // ============================================

    function test_Fork_SwapRouterAcceptsETH() public onlyFork {
        (bool success,) = address(swapRouter).call{value: 0.001 ether}("");
        assertTrue(success, "SwapRouter should accept ETH");
    }

    // ============================================
    // TEST: Uniswap V4 PoolManager 存在
    // ============================================

    function test_Fork_PoolManagerExists() public onlyFork {
        assertTrue(_hasCode(UNISWAP_V4_POOL_MANAGER), "PoolManager should exist");
        
        // 尝试调用 PoolManager 的接口
        // (只检查合约存在和可调用)
        (bool success,) = UNISWAP_V4_POOL_MANAGER.staticcall(
            abi.encodeWithSignature("protocolFeeController()")
        );
        console.log("PoolManager protocolFeeController() callable:", success);
    }

    // ============================================
    // 辅助函数
    // ============================================

    function _hasCode(address addr) internal view returns (bool) {
        uint256 codeSize;
        assembly {
            codeSize := extcodesize(addr)
        }
        return codeSize > 0;
    }
}
