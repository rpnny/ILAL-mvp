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
     * @notice 测试真实生成的 PLONK Proof
     * @dev 使用 circuits/test-data/foundry-test-data.json 的数据
     */
    function testRealGeneratedPlonkProof() public {
        console.log("\n=== Test: Real Generated PLONK Proof ===\n");
        
        // 从 generate-test-proof.js 生成的真实数据
        uint256[24] memory proof = [
            0x2fa0fe6d5e2f705719e5ec98f54bc3c339b279a527b4dad3766d6ff304c7cd87,
            0x255154c651faf5c0cd1cebf07e6da61fabee7f360d9c4d9b31cbc597cae08fd2,
            0x1aeb13fea4cfb6837373af4a4ab42f4e2de2544e5c28d873b556590acccf0de4,
            0x0bedbc11d010f624cec4bd34ba2f4651a48c1d513d4a94559ccfdd8566e1015f,
            0x14f3928c5ec77252f8d260a0d10f67d4b948ed251a29f47f967b4c9b3f2f8fc8,
            0x1e7bbf60e0357cd9b09bb08af206cb190fef0032402097ff5ddc6d4ab325f4b9,
            0x1f4c0f8d0255f075c822361dcd3009918be0f3f6068db819d9b72ce971eabbbf,
            0x0d79caeff4319a94b82eee1cce764c6a98b045d49e42aa6cbca41e4c8c9c1ce9,
            0x05f010ba96b18ac645681da549321124e6ce5bb00895d2635cacb7703715aff1,
            0x0de1c57ee6840a08e72d5325240d809f5611db85ece32dd06a01e5745fffbe2a,
            0x24830ac393b5ad0bb8160255c911e10db4423d4174114da504e7321d77d68153,
            0x10f2ffad177950a3b295fd01e94606cb9ae95cb421034097c213b2dd790c3381,
            0x0f020008b042e92ee3af38414e6c1d503d365c1a196d35603dec17dc610448d4,
            0x302ee537e83baf083176537887182cf52334fbe0533eee9b7664680e3219e676,
            0x0870dc095868f908fb28f05bb2ced4e7d1418c531f39cac4061f5630234cf21d,
            0x26866b1bdebe7a3be88c3912f9581725b875ed53065230d602acef00b87f729e,
            0x2d0457c69df342b4ba9553b80ef6442f0e910a92a05949739919abcae3464be5,
            0x00ce06e4c018628e6c0622f5368dc0786a54ca72c43b93097e4d7600e4ea8f6e,
            0x0f03617a84c8df6935193ef4504eb0e96beeebb717cf43328034b07b40a49551,
            0x14d4bfd1a4c0923b936297cc11c6fa6ae0f4fd7f75f0bcc3f892eae36b179e81,
            0x09983d6988899e5489bc15233977d1a19985f37c623752fd6afcd1f86edd099a,
            0x25962d0bbd8c4f9aa90a5c77aa836d87f52a387c4fb3a4b0b883484e594b0668,
            0x2971b4bcc84caa28933e358c64c957eda70050d5b8f084fc0b8bcd4122f76976,
            0x0073754f3f9b59faaad10de3477fd9f40acc80a963b15c195f13384dd3d865f0
        ];
        
        uint256[3] memory publicInputs = [
            1390849295786071768276380950238675083608645509734,
            16656510059435459681513198351861654749764021936351048812511517263214375261742,
            305171102522423601911163225780764181897910540270
        ];
        
        console.log("Public Inputs:");
        console.log("- userAddress:", publicInputs[0]);
        console.log("- merkleRoot:", publicInputs[1]);
        console.log("- issuerPubKeyHash:", publicInputs[2]);
        
        // 测试 PlonkVerifier 直接验证
        console.log("\nStep 1: Testing PlonkVerifier...");
        bool isValid = plonkVerifier.verifyProof(proof, publicInputs);
        
        if (isValid) {
            console.log("SUCCESS: PlonkVerifier: VALID");
        } else {
            console.log("FAILED: PlonkVerifier: INVALID");
        }
        
        assertTrue(isValid, "PlonkVerifier should validate the proof");
        
        // 测试 PlonkVerifierAdapter
        console.log("\nStep 2: Testing PlonkVerifierAdapter...");
        
        // 将 proof 编码为 bytes
        bytes memory proofBytes = new bytes(768); // 24 * 32 bytes
        for (uint i = 0; i < 24; i++) {
            bytes32 element = bytes32(proof[i]);
            for (uint j = 0; j < 32; j++) {
                proofBytes[i * 32 + j] = element[j];
            }
        }
        
        // 将 publicInputs 转换为动态数组
        uint256[] memory publicInputsArray = new uint256[](3);
        publicInputsArray[0] = publicInputs[0];
        publicInputsArray[1] = publicInputs[1];
        publicInputsArray[2] = publicInputs[2];
        
        bool isValidAdapter = verifierAdapter.verifyComplianceProof(proofBytes, publicInputsArray);
        
        if (isValidAdapter) {
            console.log("SUCCESS: PlonkVerifierAdapter: VALID");
        } else {
            console.log("FAILED: PlonkVerifierAdapter: INVALID");
        }
        
        assertTrue(isValidAdapter, "PlonkVerifierAdapter should validate the proof");
        
        console.log("\nSUCCESS: All verifications passed!");
    }
    
    /**
     * @notice 测试完整的验证和 Session 激活流程
     */
    function testProofVerificationAndSessionActivation() public {
        console.log("\n=== Test: Proof Verification + Session Activation ===\n");
        
        // 使用真实生成的 proof
        uint256[24] memory proof = [
            0x2fa0fe6d5e2f705719e5ec98f54bc3c339b279a527b4dad3766d6ff304c7cd87,
            0x255154c651faf5c0cd1cebf07e6da61fabee7f360d9c4d9b31cbc597cae08fd2,
            0x1aeb13fea4cfb6837373af4a4ab42f4e2de2544e5c28d873b556590acccf0de4,
            0x0bedbc11d010f624cec4bd34ba2f4651a48c1d513d4a94559ccfdd8566e1015f,
            0x14f3928c5ec77252f8d260a0d10f67d4b948ed251a29f47f967b4c9b3f2f8fc8,
            0x1e7bbf60e0357cd9b09bb08af206cb190fef0032402097ff5ddc6d4ab325f4b9,
            0x1f4c0f8d0255f075c822361dcd3009918be0f3f6068db819d9b72ce971eabbbf,
            0x0d79caeff4319a94b82eee1cce764c6a98b045d49e42aa6cbca41e4c8c9c1ce9,
            0x05f010ba96b18ac645681da549321124e6ce5bb00895d2635cacb7703715aff1,
            0x0de1c57ee6840a08e72d5325240d809f5611db85ece32dd06a01e5745fffbe2a,
            0x24830ac393b5ad0bb8160255c911e10db4423d4174114da504e7321d77d68153,
            0x10f2ffad177950a3b295fd01e94606cb9ae95cb421034097c213b2dd790c3381,
            0x0f020008b042e92ee3af38414e6c1d503d365c1a196d35603dec17dc610448d4,
            0x302ee537e83baf083176537887182cf52334fbe0533eee9b7664680e3219e676,
            0x0870dc095868f908fb28f05bb2ced4e7d1418c531f39cac4061f5630234cf21d,
            0x26866b1bdebe7a3be88c3912f9581725b875ed53065230d602acef00b87f729e,
            0x2d0457c69df342b4ba9553b80ef6442f0e910a92a05949739919abcae3464be5,
            0x00ce06e4c018628e6c0622f5368dc0786a54ca72c43b93097e4d7600e4ea8f6e,
            0x0f03617a84c8df6935193ef4504eb0e96beeebb717cf43328034b07b40a49551,
            0x14d4bfd1a4c0923b936297cc11c6fa6ae0f4fd7f75f0bcc3f892eae36b179e81,
            0x09983d6988899e5489bc15233977d1a19985f37c623752fd6afcd1f86edd099a,
            0x25962d0bbd8c4f9aa90a5c77aa836d87f52a387c4fb3a4b0b883484e594b0668,
            0x2971b4bcc84caa28933e358c64c957eda70050d5b8f084fc0b8bcd4122f76976,
            0x0073754f3f9b59faaad10de3477fd9f40acc80a963b15c195f13384dd3d865f0
        ];
        
        uint256[3] memory publicInputs = [
            1390849295786071768276380950238675083608645509734,
            16656510059435459681513198351861654749764021936351048812511517263214375261742,
            305171102522423601911163225780764181897910540270
        ];
        
        // userAddress 从 publicInputs[0] 转换
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
