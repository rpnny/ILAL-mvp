// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "../../src/verifiers/PlonkVerifier.sol";
import "../../src/verifiers/PlonkVerifierAdapter.sol";
import "../../src/core/SessionManager.sol";
import "../../src/core/Registry.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title PlonkIntegrationTest
 * @notice 测试 PLONK 验证器与 SessionManager 的集成
 */
contract PlonkIntegrationTest is Test {
    PlonkVerifier public plonkVerifier;
    PlonkVerifierAdapter public adapter;
    SessionManager public sessionManager;
    Registry public registry;

    address public admin = makeAddr("admin");
    address public alice = makeAddr("alice");

    function setUp() public {
        // 1. 部署 PLONK 验证器
        plonkVerifier = new PlonkVerifier();
        console.log("PlonkVerifier deployed at:", address(plonkVerifier));

        // 2. 部署适配器
        adapter = new PlonkVerifierAdapter(address(plonkVerifier));
        console.log("PlonkVerifierAdapter deployed at:", address(adapter));

        // 3. 部署 Registry
        Registry registryImpl = new Registry();
        bytes memory registryInitData = abi.encodeWithSelector(
            Registry.initialize.selector,
            admin
        );
        ERC1967Proxy registryProxy = new ERC1967Proxy(
            address(registryImpl),
            registryInitData
        );
        registry = Registry(address(registryProxy));

        // 4. 部署 SessionManager (使用 PLONK 适配器)
        SessionManager sessionImpl = new SessionManager();
        bytes memory sessionInitData = abi.encodeWithSelector(
            SessionManager.initialize.selector,
            address(registry),
            address(adapter),  // 使用 PLONK 适配器
            admin
        );
        ERC1967Proxy sessionProxy = new ERC1967Proxy(
            address(sessionImpl),
            sessionInitData
        );
        sessionManager = SessionManager(address(sessionProxy));

        // 5. 赋予适配器 VERIFIER_ROLE
        bytes32 verifierRole = sessionManager.VERIFIER_ROLE();
        vm.prank(admin);
        sessionManager.grantRole(verifierRole, address(adapter));

        console.log("Setup complete!");
    }

    // ============ PlonkVerifier 基础测试 ============

    function test_PlonkVerifier_Interface() public view {
        // 验证 PlonkVerifier 有正确的接口
        assertTrue(address(plonkVerifier) != address(0));
        console.log("PlonkVerifier interface verified");
    }

    function test_PlonkVerifierAdapter_Version() public view {
        string memory version = adapter.version();
        console.log("Adapter version:", version);
        assertTrue(bytes(version).length > 0);
    }

    // ============ 适配器测试 ============

    function test_Adapter_RevertWhen_InvalidProofLength() public {
        // 错误的 proof 长度
        bytes memory invalidProof = new bytes(100);
        uint256[] memory publicInputs = new uint256[](3);

        vm.expectRevert(PlonkVerifierAdapter.InvalidProofLength.selector);
        adapter.verifyComplianceProof(invalidProof, publicInputs);
    }

    function test_Adapter_RevertWhen_InvalidPublicInputsLength() public {
        // 正确的 proof 长度 (768 bytes = 24 * 32)
        bytes memory validProof = new bytes(768);

        // 错误的 publicInputs 长度
        uint256[] memory invalidInputs = new uint256[](2);

        vm.expectRevert(PlonkVerifierAdapter.InvalidPublicInputsLength.selector);
        adapter.verifyComplianceProof(validProof, invalidInputs);
    }

    function test_Adapter_ExtractUserAddress() public view {
        // 创建测试数据
        bytes memory proof = new bytes(768);
        uint256[] memory publicInputs = new uint256[](3);

        // 第一个公共输入是用户地址
        publicInputs[0] = uint256(uint160(alice));
        publicInputs[1] = 0x123456; // merkleRoot
        publicInputs[2] = 0x789abc; // issuerPubKeyHash

        // 调用 verifyAndExtractUser
        (address extractedUser, bool isValid) = adapter.verifyAndExtractUser(
            proof,
            publicInputs
        );

        // 验证地址提取正确
        assertEq(extractedUser, alice);
        console.log("Extracted user:", extractedUser);
        console.log("Alice address:", alice);
    }

    // ============ 集成测试（使用模拟 Proof）============

    function test_Integration_SessionManager_WithAdapter() public {
        // 验证 SessionManager 已正确连接到适配器
        assertEq(address(sessionManager.registry()), address(registry));
        console.log("SessionManager connected to Registry");

        // 检查适配器是否有 VERIFIER_ROLE
        bytes32 verifierRole = sessionManager.VERIFIER_ROLE();
        assertTrue(sessionManager.hasRole(verifierRole, address(adapter)));
        console.log("Adapter has VERIFIER_ROLE");
    }

    // ============ Gas 测试 ============

    function test_PlonkVerifier_GasEstimate() public view {
        // 创建测试 proof（全零，仅用于 Gas 估算）
        uint256[24] memory proof;
        uint256[3] memory pubSignals;

        uint256 gasBefore = gasleft();
        try plonkVerifier.verifyProof(proof, pubSignals) {
            uint256 gasUsed = gasBefore - gasleft();
            console.log("PlonkVerifier gas used:", gasUsed);
        } catch {
            console.log("Proof verification failed (expected for zero proof)");
        }
    }

    // ============ 辅助函数 ============

    /**
     * @notice 生成模拟的 Proof 数据 (仅用于测试结构)
     * @return proof 768 字节的模拟 proof
     */
    function _generateMockProof() internal pure returns (bytes memory proof) {
        proof = new bytes(768);

        // 填充一些非零数据
        for (uint256 i = 0; i < 24; i++) {
            bytes32 value = keccak256(abi.encodePacked(i));
            for (uint256 j = 0; j < 32; j++) {
                proof[i * 32 + j] = value[j];
            }
        }

        return proof;
    }

    /**
     * @notice 生成模拟的公共输入
     * @param user 用户地址
     * @return publicInputs 公共输入数组
     */
    function _generateMockPublicInputs(address user)
        internal
        pure
        returns (uint256[] memory publicInputs)
    {
        publicInputs = new uint256[](3);
        publicInputs[0] = uint256(uint160(user));
        publicInputs[1] = uint256(keccak256("merkleRoot"));
        publicInputs[2] = uint256(keccak256("issuerPubKeyHash"));
        return publicInputs;
    }
}
