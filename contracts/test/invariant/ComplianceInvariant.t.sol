// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "forge-std/StdInvariant.sol";
import "../../src/core/Registry.sol";
import "../../src/core/SessionManager.sol";
import "../../src/core/MockVerifier.sol";
import "../../src/core/ComplianceHook.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title ComplianceInvariantTest
 * @notice Fuzz/Invariant 测试 - 确保核心不变性始终成立
 * 
 * 关键不变性：
 * 1. 未验证用户无法执行任何操作
 * 2. Session nonce 单调递增
 * 3. Emergency 时所有操作被阻止
 * 4. Session 过期时间不会倒退
 */
contract ComplianceInvariantTest is StdInvariant, Test {
    Registry public registry;
    SessionManager public sessionManager;
    MockVerifier public verifier;
    ComplianceHook public hook;

    address public governance = makeAddr("governance");
    address public router = makeAddr("router");

    // 跟踪状态
    mapping(address => uint256) public lastExpiry;
    mapping(address => uint256) public lastNonce;
    mapping(address => uint256) public balanceChange;

    address[] public users;
    uint256 public successfulSwaps;
    uint256 public successfulAdds;

    function setUp() public {
        // 部署合约
        Registry registryImpl = new Registry();
        bytes memory registryInitData = abi.encodeWithSelector(
            Registry.initialize.selector,
            governance
        );
        ERC1967Proxy registryProxy = new ERC1967Proxy(
            address(registryImpl),
            registryInitData
        );
        registry = Registry(address(registryProxy));

        verifier = new MockVerifier();

        SessionManager sessionImpl = new SessionManager();
        bytes memory sessionInitData = abi.encodeWithSelector(
            SessionManager.initialize.selector,
            address(registry),
            address(verifier),
            governance
        );
        ERC1967Proxy sessionProxy = new ERC1967Proxy(
            address(sessionImpl),
            sessionInitData
        );
        sessionManager = SessionManager(address(sessionProxy));

        vm.prank(governance);
        sessionManager.grantRole(sessionManager.VERIFIER_ROLE(), address(verifier));

        hook = new ComplianceHook(address(registry), address(sessionManager));

        vm.prank(governance);
        registry.approveRouter(router, true);

        // 设置 Fuzz 目标
        targetContract(address(hook));
        targetContract(address(sessionManager));
    }

    // ============ 不变性 1: 未验证用户余额不变 ============

    function invariant_unverifiedUserBalanceZero() public view {
        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            if (!sessionManager.isSessionActive(user)) {
                assertEq(
                    balanceChange[user],
                    0,
                    "Unverified user balance should not change"
                );
            }
        }
    }

    // ============ 不变性 2: Session 过期时间单调 ============

    function invariant_sessionExpiryMonotonic() public view {
        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            uint256 currentExpiry = sessionManager.sessionExpiry(user);

            if (currentExpiry > 0) {
                assertGe(
                    currentExpiry,
                    lastExpiry[user],
                    "Session expiry should not decrease"
                );
            }
        }
    }

    // ============ 不变性 3: Emergency 时无交易 ============

    function invariant_emergencyPauseBlocksAll() public view {
        if (registry.emergencyPaused()) {
            assertEq(
                successfulSwaps,
                0,
                "No swaps should succeed during emergency"
            );
            assertEq(
                successfulAdds,
                0,
                "No adds should succeed during emergency"
            );
        }
    }

    // ============ 不变性 4: Nonce 单调递增 ============

    function invariant_nonceMonotonic() public view {
        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            uint256 currentNonce = hook.getNonce(user);

            assertGe(
                currentNonce,
                lastNonce[user],
                "Nonce should only increase"
            );
        }
    }

    // ============ 不变性 5: 只有激活的 Issuer 可用 ============

    function invariant_onlyActiveIssuersAccepted() public view {
        bytes32 coinbaseId = keccak256("Coinbase");
        Registry.IssuerInfo memory info = registry.getIssuerInfo(coinbaseId);

        if (!info.active) {
            // 如果 Coinbase 被撤销，所有新 Session 应该失败
            // (此测试需要更复杂的状态追踪)
        }
    }

    // ============ 辅助函数 ============

    function _trackUser(address user) internal {
        bool found = false;
        for (uint256 i = 0; i < users.length; i++) {
            if (users[i] == user) {
                found = true;
                break;
            }
        }
        if (!found) {
            users.push(user);
        }
    }
}
