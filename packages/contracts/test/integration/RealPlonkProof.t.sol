// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "../../src/verifiers/PlonkVerifier.sol";
import "../../src/verifiers/PlonkVerifierAdapter.sol";
import "../../src/core/SessionManager.sol";
import "../../src/core/Registry.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title RealPlonkProof 测试
 * @notice 使用真实的 PLONK Proof 进行端到端测试
 * @dev 使用 circuits/scripts/generate-test-proof.js 生成的真实 Proof
 */
contract RealPlonkProofTest is Test {
    PlonkVerifier public plonkVerifier;
    PlonkVerifierAdapter public verifierAdapter;
    SessionManager public sessionManager;
    Registry public registry;
    
    address public governance = makeAddr("governance");
    address public testUser = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266; // Anvil account #0
    
    function setUp() public {
        vm.startPrank(governance);
        
        // 1. 部署 Registry
        Registry registryImpl = new Registry();
        bytes memory registryData = abi.encodeWithSelector(
            Registry.initialize.selector,
            governance
        );
        ERC1967Proxy registryProxy = new ERC1967Proxy(
            address(registryImpl),
            registryData
        );
        registry = Registry(address(registryProxy));
        
        // 2. 部署 PlonkVerifier
        plonkVerifier = new PlonkVerifier();
        
        // 3. 部署 PlonkVerifierAdapter
        verifierAdapter = new PlonkVerifierAdapter(address(plonkVerifier));
        
        // 4. 部署 SessionManager
        SessionManager sessionManagerImpl = new SessionManager();
        bytes memory sessionData = abi.encodeWithSelector(
            SessionManager.initialize.selector,
            address(registry),
            address(verifierAdapter),
            governance
        );
        ERC1967Proxy sessionManagerProxy = new ERC1967Proxy(
            address(sessionManagerImpl),
            sessionData
        );
        sessionManager = SessionManager(address(sessionManagerProxy));
        
        vm.stopPrank();
        
        console.log("=== Setup Complete ===");
        console.log("Registry:", address(registry));
        console.log("PlonkVerifier:", address(plonkVerifier));
        console.log("VerifierAdapter:", address(verifierAdapter));
        console.log("SessionManager:", address(sessionManager));
        console.log("Test User:", testUser);
    }
    
    /**
     * @notice 测试真实生成的 PLONK Proof（EdDSA-Poseidon 电路，5 公共输入）
     * @dev 使用 circuits/test-data/foundry-test-data.json 的数据
     */
    function testRealGeneratedPlonkProof() public {
        console.log("\n=== Test: Real Generated PLONK Proof (EdDSA) ===\n");
        
        uint256[24] memory proof = [
            0x24317d6dd3da6115b55e681facbb83f39adb1dd5dd5d3c9d24493dcad1b2f8aa,
            0x12ad122bfb699a797084424977003438bdab359164e47f99e6fd2bc760bcaa59,
            0x217c123f1915f3b76c9af8d60b2ebd8686c2c285b4671a1ec69e3fa47fe2b960,
            0x0b387defa10da8e0a8f977bca1ea7390ed8b1c638167025b2abbc4a0e105b50d,
            0x2f896df70d2fd635fb798eb413f422d33f3365c0a7f40715f7acfac6cdf64f3d,
            0x19af2d607f72bc5a08384357aa8dbb15f8822a1bdf4fdd87d5013edc8d9842b4,
            0x2f102a304688cf5b707b54d3f6f4fe49100f638d9d7e43d2dc251ba7e3e4d415,
            0x03e36d0cf7c9b955fd883336773f8579ffe1715692c16ee897b587b7e778f38c,
            0x2094995212726ea496de252e385c11539176a7ecb734fe34e8774d8420b48d31,
            0x1e7a29bb6ec9176649d8dcf2cc5a26ca9508fdc69e1a768dda6c95edfaf24060,
            0x0b8c0c95ea0fcd59924413abe0a092f05206d966b0b7dcb639328c1cb315eebc,
            0x089af9e6c796e1122316b446d9a24dbcc693e64a4c619aac85f07348b50860a8,
            0x2f3c87501a16148f8a8b16b5470a249f4ea075b5ad83244590866df1fecd9e5f,
            0x00d0e1721857d505381fae636068f528eafd9ac5644b7771337d66b8461eec1c,
            0x0755dda5ded584eb8ecd2defef6c12511c9b293899ec93ccc8a57fc5761e661a,
            0x2c5e63b637fa9896bb746f8b2a87c00d10aac790eb5f30d6066b1203becef13f,
            0x17aeecf77d5bca9ecdf80396e1f5dddef4f2bf4639d5d27519fb43bc72db810c,
            0x0f94e916dcdc652c47a56fbd774883aa5adecad081ad7e7d996e3d6d127198f3,
            0x0518cfda2143618b0d17f08290d7c6fd831f2da7c8047c24a2471585308ca9fe,
            0x1cbae337e323593b5cf8df275e044fa4a8173b60105037a0b9a29a38140570a1,
            0x255b7cda94ec3058d5b70073c31ae5345511ecd616522cbdb08d3db4c33a0145,
            0x0498bc5ffc4d50e89896089bf8ceb199eeb0ed41929985b9019db8c74f0b4a9f,
            0x093f4623bbd5a9c0079489f5977ec4588cd33b08b6fec80064a6b60f59e2fa68,
            0x18a9428b617d4a7a510f7cd8d26af2a3a879e5890a0eaaa735791289e15b8055
        ];
        
        uint256[5] memory publicInputs = [
            1390849295786071768276380950238675083608645509734,
            16656510059435459681513198351861654749764021936351048812511517263214375261742,
            13277427435165878497778222415993513565335242147425444199013288855685581939618,
            13622229784656158136036771217484571176836296686641868549125388198837476602820,
            1772509446
        ];
        
        console.log("Public Inputs:");
        console.log("- userAddress:", publicInputs[0]);
        console.log("- merkleRoot:", publicInputs[1]);
        console.log("- issuerAx:", publicInputs[2]);
        console.log("- issuerAy:", publicInputs[3]);
        console.log("- timestamp:", publicInputs[4]);
        
        console.log("\nStep 1: Testing PlonkVerifier...");
        bool isValid = plonkVerifier.verifyProof(proof, publicInputs);
        assertTrue(isValid, "PlonkVerifier should validate the proof");
        console.log("SUCCESS: PlonkVerifier: VALID");
        
        console.log("\nStep 2: Testing PlonkVerifierAdapter...");
        bytes memory proofBytes = new bytes(768);
        for (uint i = 0; i < 24; i++) {
            bytes32 element = bytes32(proof[i]);
            for (uint j = 0; j < 32; j++) {
                proofBytes[i * 32 + j] = element[j];
            }
        }
        
        uint256[] memory publicInputsArray = new uint256[](5);
        for (uint i = 0; i < 5; i++) {
            publicInputsArray[i] = publicInputs[i];
        }
        
        bool isValidAdapter = verifierAdapter.verifyComplianceProof(proofBytes, publicInputsArray);
        assertTrue(isValidAdapter, "PlonkVerifierAdapter should validate the proof");
        console.log("SUCCESS: PlonkVerifierAdapter: VALID");
        
        console.log("\nSUCCESS: All verifications passed!");
    }
    
    /**
     * @notice 测试完整的验证和 Session 激活流程
     */
    function testProofVerificationAndSessionActivation() public {
        console.log("\n=== Test: Proof Verification + Session Activation ===\n");
        
        uint256[24] memory proof = [
            0x24317d6dd3da6115b55e681facbb83f39adb1dd5dd5d3c9d24493dcad1b2f8aa,
            0x12ad122bfb699a797084424977003438bdab359164e47f99e6fd2bc760bcaa59,
            0x217c123f1915f3b76c9af8d60b2ebd8686c2c285b4671a1ec69e3fa47fe2b960,
            0x0b387defa10da8e0a8f977bca1ea7390ed8b1c638167025b2abbc4a0e105b50d,
            0x2f896df70d2fd635fb798eb413f422d33f3365c0a7f40715f7acfac6cdf64f3d,
            0x19af2d607f72bc5a08384357aa8dbb15f8822a1bdf4fdd87d5013edc8d9842b4,
            0x2f102a304688cf5b707b54d3f6f4fe49100f638d9d7e43d2dc251ba7e3e4d415,
            0x03e36d0cf7c9b955fd883336773f8579ffe1715692c16ee897b587b7e778f38c,
            0x2094995212726ea496de252e385c11539176a7ecb734fe34e8774d8420b48d31,
            0x1e7a29bb6ec9176649d8dcf2cc5a26ca9508fdc69e1a768dda6c95edfaf24060,
            0x0b8c0c95ea0fcd59924413abe0a092f05206d966b0b7dcb639328c1cb315eebc,
            0x089af9e6c796e1122316b446d9a24dbcc693e64a4c619aac85f07348b50860a8,
            0x2f3c87501a16148f8a8b16b5470a249f4ea075b5ad83244590866df1fecd9e5f,
            0x00d0e1721857d505381fae636068f528eafd9ac5644b7771337d66b8461eec1c,
            0x0755dda5ded584eb8ecd2defef6c12511c9b293899ec93ccc8a57fc5761e661a,
            0x2c5e63b637fa9896bb746f8b2a87c00d10aac790eb5f30d6066b1203becef13f,
            0x17aeecf77d5bca9ecdf80396e1f5dddef4f2bf4639d5d27519fb43bc72db810c,
            0x0f94e916dcdc652c47a56fbd774883aa5adecad081ad7e7d996e3d6d127198f3,
            0x0518cfda2143618b0d17f08290d7c6fd831f2da7c8047c24a2471585308ca9fe,
            0x1cbae337e323593b5cf8df275e044fa4a8173b60105037a0b9a29a38140570a1,
            0x255b7cda94ec3058d5b70073c31ae5345511ecd616522cbdb08d3db4c33a0145,
            0x0498bc5ffc4d50e89896089bf8ceb199eeb0ed41929985b9019db8c74f0b4a9f,
            0x093f4623bbd5a9c0079489f5977ec4588cd33b08b6fec80064a6b60f59e2fa68,
            0x18a9428b617d4a7a510f7cd8d26af2a3a879e5890a0eaaa735791289e15b8055
        ];
        
        uint256[5] memory publicInputs = [
            1390849295786071768276380950238675083608645509734,
            16656510059435459681513198351861654749764021936351048812511517263214375261742,
            13277427435165878497778222415993513565335242147425444199013288855685581939618,
            13622229784656158136036771217484571176836296686641868549125388198837476602820,
            1772509446
        ];
        
        address user = address(uint160(publicInputs[0]));
        console.log("User address:", user);
        
        // Step 1: 验证 Proof
        console.log("\nStep 1: Verifying proof...");
        bool isValid = plonkVerifier.verifyProof(proof, publicInputs);
        assertTrue(isValid, "Proof verification should succeed");
        console.log("SUCCESS: Proof verified");
        
        // Step 2: 检查初始 Session 状态
        console.log("\nStep 2: Checking initial session status...");
        bool isActiveInitial = sessionManager.isSessionActive(user);
        assertFalse(isActiveInitial, "Session should not be active initially");
        console.log("SUCCESS: No active session initially");
        
        // Step 3: 激活 Session（模拟 Verifier 调用）
        console.log("\nStep 3: Activating session...");
        uint256 expiry = block.timestamp + 86400; // 24 hours
        
        vm.prank(address(verifierAdapter));
        sessionManager.startSession(user, expiry);
        
        console.log("SUCCESS: Session activated");
        
        // Step 4: 验证 Session 已激活
        console.log("\nStep 4: Verifying session is active...");
        bool isActiveNow = sessionManager.isSessionActive(user);
        assertTrue(isActiveNow, "Session should be active now");
        
        uint256 sessionExpiry = sessionManager.sessionExpiry(user);
        console.log("Session expiry:", sessionExpiry);
        console.log("Current time:", block.timestamp);
        console.log("Time remaining:", sessionExpiry - block.timestamp, "seconds");
        
        console.log("\nSUCCESS: Complete flow test passed!");
    }
}
