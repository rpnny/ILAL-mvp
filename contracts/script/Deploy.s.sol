// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "../src/core/Registry.sol";
import "../src/core/SessionManager.sol";
import "../src/core/MockVerifier.sol";
import "../src/core/ComplianceHook.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title DeployILAL
 * @notice ILAL 完整部署脚本
 * @dev 部署顺序: Registry -> Verifier -> SessionManager -> ComplianceHook
 */
contract DeployILAL is Script {
    // ============ 配置常量 ============

    // Coinbase Verifications (Base Mainnet)
    address constant COINBASE_ATTESTER = 0x357458739F90461b99789350868CD7CF330Dd7EE;

    // Uniswap v4 地址 (需要在部署时更新)
    address constant UNISWAP_V4_POOL_MANAGER = address(0); // TODO: 更新
    address constant UNISWAP_UNIVERSAL_ROUTER = address(0); // TODO: 更新

    bytes32 constant COINBASE_ISSUER_ID = keccak256("Coinbase");

    // ============ 部署的合约地址 ============

    Registry public registry;
    MockVerifier public verifier;
    SessionManager public sessionManager;
    ComplianceHook public hook;

    // ============ 主部署函数 ============

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address governanceMultisig = vm.envAddress("GOVERNANCE_MULTISIG");

        require(governanceMultisig != address(0), "GOVERNANCE_MULTISIG not set");

        console.log("========================================");
        console.log("ILAL Deployment Script");
        console.log("========================================");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Governance:", governanceMultisig);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // 1. 部署 Registry (UUPS 代理)
        console.log("1. Deploying Registry...");
        registry = deployRegistry(governanceMultisig);
        console.log("   Registry Proxy:", address(registry));

        // 2. 部署 Verifier (Mock 或真实 ZK)
        console.log("2. Deploying Verifier...");
        verifier = deployVerifier();
        console.log("   Verifier:", address(verifier));

        // 3. 部署 SessionManager (UUPS 代理)
        console.log("3. Deploying SessionManager...");
        sessionManager = deploySessionManager(
            address(registry),
            address(verifier),
            governanceMultisig
        );
        console.log("   SessionManager Proxy:", address(sessionManager));

        // 4. 部署 ComplianceHook
        console.log("4. Deploying ComplianceHook...");
        hook = deployComplianceHook(
            address(registry),
            address(sessionManager)
        );
        console.log("   ComplianceHook:", address(hook));

        // 5. 配置 Registry
        console.log("5. Configuring Registry...");
        configureRegistry();

        vm.stopBroadcast();

        // 6. 输出部署摘要
        printDeploymentSummary();

        // 7. 保存部署地址到文件
        saveDeploymentAddresses();
    }

    // ============ 部署函数 ============

    function deployRegistry(address governanceMultisig)
        internal
        returns (Registry)
    {
        // 部署实现合约
        Registry implementation = new Registry();
        console.log("   Registry Implementation:", address(implementation));

        // 准备初始化数据
        bytes memory initData = abi.encodeWithSelector(
            Registry.initialize.selector,
            governanceMultisig
        );

        // 部署代理
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(implementation),
            initData
        );

        return Registry(address(proxy));
    }

    function deployVerifier() internal returns (MockVerifier) {
        // TODO: 在生产环境中替换为真实的 Groth16/PLONK Verifier
        MockVerifier _verifier = new MockVerifier();

        console.log("   ⚠️  WARNING: Using MockVerifier!");
        console.log("   ⚠️  Replace with real ZK Verifier before mainnet deployment!");

        return _verifier;
    }

    function deploySessionManager(
        address _registry,
        address _verifier,
        address _admin
    ) internal returns (SessionManager) {
        // 部署实现合约
        SessionManager implementation = new SessionManager();
        console.log("   SessionManager Implementation:", address(implementation));

        // 准备初始化数据
        bytes memory initData = abi.encodeWithSelector(
            SessionManager.initialize.selector,
            _registry,
            _verifier,
            _admin
        );

        // 部署代理
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(implementation),
            initData
        );

        return SessionManager(address(proxy));
    }

    function deployComplianceHook(
        address _registry,
        address _sessionManager
    ) internal returns (ComplianceHook) {
        return new ComplianceHook(_registry, _sessionManager);
    }

    // ============ 配置函数 ============

    function configureRegistry() internal {
        // 注册 Coinbase 为默认 Issuer
        console.log("   - Registering Coinbase as Issuer...");
        registry.registerIssuer(
            COINBASE_ISSUER_ID,
            COINBASE_ATTESTER,
            address(verifier)
        );

        // 批准 Uniswap Universal Router (如果地址已设置)
        if (UNISWAP_UNIVERSAL_ROUTER != address(0)) {
            console.log("   - Approving Uniswap Universal Router...");
            registry.approveRouter(UNISWAP_UNIVERSAL_ROUTER, true);
        } else {
            console.log("   ⚠️  WARNING: UNISWAP_UNIVERSAL_ROUTER not set!");
        }

        console.log("   Configuration complete!");
    }

    // ============ 输出和保存 ============

    function printDeploymentSummary() internal view {
        console.log("");
        console.log("========================================");
        console.log("Deployment Summary");
        console.log("========================================");
        console.log("Registry (Proxy):", address(registry));
        console.log("SessionManager (Proxy):", address(sessionManager));
        console.log("Verifier:", address(verifier));
        console.log("ComplianceHook:", address(hook));
        console.log("");
        console.log("Coinbase Issuer ID:", vm.toString(COINBASE_ISSUER_ID));
        console.log("Coinbase Attester:", COINBASE_ATTESTER);
        console.log("");
        console.log("========================================");
        console.log("Next Steps:");
        console.log("========================================");
        console.log("1. Verify contracts on Basescan");
        console.log("2. Update frontend with deployed addresses");
        console.log("3. Configure subgraph with contract addresses");
        console.log("4. Run initial tests on testnet");
        console.log("5. ⚠️  Replace MockVerifier with real ZK Verifier!");
        console.log("========================================");
    }

    function saveDeploymentAddresses() internal {
        string memory json = "deployment";

        vm.serializeAddress(json, "registry", address(registry));
        vm.serializeAddress(json, "sessionManager", address(sessionManager));
        vm.serializeAddress(json, "verifier", address(verifier));
        string memory finalJson = vm.serializeAddress(json, "complianceHook", address(hook));

        string memory outputFile = string.concat(
            vm.projectRoot(),
            "/deployments/",
            vm.toString(block.chainid),
            ".json"
        );

        vm.writeJson(finalJson, outputFile);

        console.log("");
        console.log("Deployment addresses saved to:", outputFile);
    }
}
