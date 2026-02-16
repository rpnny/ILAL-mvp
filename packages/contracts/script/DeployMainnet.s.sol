// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/core/Registry.sol";
import "../src/core/SessionManager.sol";
import "../src/core/ComplianceHook.sol";
import "../src/core/VerifiedPoolsPositionManager.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title DeployMainnet
 * @notice Base Mainnet 部署脚本
 * @dev 使用前请确保:
 *      1. 设置 PRIVATE_KEY 环境变量
 *      2. 设置 RPC_URL 环境变量 (Base Mainnet RPC)
 *      3. 设置 GOVERNANCE_ADDRESS 环境变量 (多签地址)
 *      4. 设置 VERIFIER_ADDRESS 环境变量 (真实 Verifier 合约)
 */
contract DeployMainnet is Script {
    // Base Mainnet Uniswap v4 PoolManager
    address constant POOL_MANAGER = 0x498581fF718922c3f8e6A244956aF099B2652b2b;
    
    // 部署的合约地址
    address public registry;
    address public sessionManager;
    address public complianceHook;
    address public positionManager;

    function run() external {
        // 从环境变量读取配置
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address governance = vm.envAddress("GOVERNANCE_ADDRESS");
        address verifier = vm.envAddress("VERIFIER_ADDRESS");

        require(governance != address(0), "GOVERNANCE_ADDRESS not set");
        require(verifier != address(0), "VERIFIER_ADDRESS not set");

        console.log("=== ILAL Base Mainnet Deployment ===");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Governance:", governance);
        console.log("Verifier:", verifier);
        console.log("PoolManager:", POOL_MANAGER);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // 1. 部署 Registry
        console.log("1. Deploying Registry...");
        Registry registryImpl = new Registry();
        bytes memory registryInitData = abi.encodeWithSelector(
            Registry.initialize.selector,
            governance
        );
        ERC1967Proxy registryProxy = new ERC1967Proxy(
            address(registryImpl),
            registryInitData
        );
        registry = address(registryProxy);
        console.log("   Registry:", registry);

        // 2. 部署 SessionManager
        console.log("2. Deploying SessionManager...");
        SessionManager sessionImpl = new SessionManager();
        bytes memory sessionInitData = abi.encodeWithSelector(
            SessionManager.initialize.selector,
            registry,
            verifier,
            governance
        );
        ERC1967Proxy sessionProxy = new ERC1967Proxy(
            address(sessionImpl),
            sessionInitData
        );
        sessionManager = address(sessionProxy);
        console.log("   SessionManager:", sessionManager);

        // 3. 部署 ComplianceHook
        console.log("3. Deploying ComplianceHook...");
        ComplianceHook hook = new ComplianceHook(registry, sessionManager);
        complianceHook = address(hook);
        console.log("   ComplianceHook:", complianceHook);

        // 4. 部署 VerifiedPoolsPositionManager
        console.log("4. Deploying VerifiedPoolsPositionManager...");
        VerifiedPoolsPositionManager pm = new VerifiedPoolsPositionManager(
            POOL_MANAGER,
            registry,
            sessionManager
        );
        positionManager = address(pm);
        console.log("   PositionManager:", positionManager);

        vm.stopBroadcast();

        // 输出部署摘要
        console.log("");
        console.log("=== Deployment Summary ===");
        console.log("Registry:        ", registry);
        console.log("SessionManager:  ", sessionManager);
        console.log("ComplianceHook:  ", complianceHook);
        console.log("PositionManager: ", positionManager);
        console.log("");
        console.log("=== Post-Deployment Steps ===");
        console.log("1. Grant VERIFIER_ROLE to verifier contract");
        console.log("2. Register Issuer in Registry");
        console.log("3. Approve Router in Registry");
        console.log("4. Update frontend contract addresses");
        console.log("5. Update subgraph contract addresses");
        console.log("6. Update bot config");
    }
}
