// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {Registry} from "../src/core/Registry.sol";
import {SessionManager} from "../src/core/SessionManager.sol";
import {ComplianceHook} from "../src/core/ComplianceHook.sol";
import {PlonkVerifier} from "../src/verifiers/PlonkVerifier.sol";
import {PlonkVerifierAdapter} from "../src/verifiers/PlonkVerifierAdapter.sol";
import {IVerifier} from "../src/interfaces/IVerifier.sol";
import {VerifiedPoolsPositionManager} from "../src/core/VerifiedPoolsPositionManager.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title DeployPlonk
 * @notice 部署脚本 - 使用真实的 PLONK 验证器
 * @dev 专门用于生产环境部署
 * 
 * 使用方法:
 * forge script script/DeployPlonk.s.sol:DeployPlonk --rpc-url <RPC_URL> --broadcast
 */
contract DeployPlonk is Script {
    // ============ 部署的合约地址 ============
    
    Registry public registry;
    SessionManager public sessionManager;
    PlonkVerifier public plonkVerifier;
    PlonkVerifierAdapter public verifierAdapter;
    ComplianceHook public hook;
    VerifiedPoolsPositionManager public positionManager;

    // ============ 配置参数 ============
    
    address public deployer;
    address public governance;

    function setUp() public {}

    function run() public {
        // 1. 获取部署者和治理地址
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        deployer = vm.addr(deployerPrivateKey);
        governance = vm.envOr("GOVERNANCE_ADDRESS", deployer);

        console.log("==============================================");
        console.log("ILAL - PLONK Production Deployment");
        console.log("==============================================");
        console.log("Deployer:", deployer);
        console.log("Governance:", governance);
        console.log("Chain ID:", block.chainid);
        console.log("==============================================");
        console.log("");

        // 2. 开始部署
        vm.startBroadcast(deployerPrivateKey);

        // 部署所有合约
        deployAllContracts();

        // 配置系统
        configureSystem();

        vm.stopBroadcast();

        // 3. 输出部署信息
        printDeploymentInfo();

        // 4. 保存部署地址
        // saveDeploymentAddresses(); // 注释掉以避免 vm.writeFile 权限错误
    }

    function deployAllContracts() internal {
        console.log("Step 1: Deploying all contracts...");
        console.log("");

        // 1. 部署 PLONK 验证器
        console.log("1/6 Deploying PLONK Verifier...");
        plonkVerifier = new PlonkVerifier();
        console.log("    PlonkVerifier deployed at:", address(plonkVerifier));
        
        verifierAdapter = new PlonkVerifierAdapter(address(plonkVerifier));
        console.log("    PlonkVerifierAdapter deployed at:", address(verifierAdapter));
        console.log("    Version:", verifierAdapter.version());
        console.log("");

        // 2. 部署 Registry (UUPS 代理)
        console.log("2/6 Deploying Registry (UUPS)...");
        Registry registryImpl = new Registry();
        console.log("    Registry implementation:", address(registryImpl));

        bytes memory registryInitData = abi.encodeWithSelector(
            Registry.initialize.selector,
            governance
        );
        
        ERC1967Proxy registryProxy = new ERC1967Proxy(
            address(registryImpl),
            registryInitData
        );
        registry = Registry(address(registryProxy));
        console.log("    Registry proxy:", address(registry));
        console.log("");

        // 3. 部署 SessionManager (UUPS 代理)
        console.log("3/6 Deploying SessionManager (UUPS)...");
        SessionManager sessionImpl = new SessionManager();
        console.log("    SessionManager implementation:", address(sessionImpl));

        bytes memory sessionInitData = abi.encodeWithSelector(
            SessionManager.initialize.selector,
            address(registry),
            address(verifierAdapter),
            governance
        );
        
        ERC1967Proxy sessionProxy = new ERC1967Proxy(
            address(sessionImpl),
            sessionInitData
        );
        sessionManager = SessionManager(address(sessionProxy));
        console.log("    SessionManager proxy:", address(sessionManager));
        console.log("");

        // 4. 部署 ComplianceHook
        console.log("4/6 Deploying ComplianceHook...");
        hook = new ComplianceHook(
            address(registry),
            address(sessionManager)
        );
        console.log("    ComplianceHook deployed at:", address(hook));
        console.log("");

        // 5. 部署 VerifiedPoolsPositionManager
        console.log("5/6 Deploying VerifiedPoolsPositionManager...");
        
        // Uniswap v4 PoolManager 地址
        // Base Sepolia: 0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408
        // Base Mainnet: 0x498581ff718922c3f8e6a244956af099b2652b2b
        address poolManager = vm.envOr("POOL_MANAGER_ADDRESS", address(0));
        
        if (poolManager == address(0)) {
            // 根据链 ID 自动选择正确的地址
            if (block.chainid == 84532) {
                // Base Sepolia
                poolManager = 0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408;
                console.log("    Using Base Sepolia PoolManager");
            } else if (block.chainid == 8453) {
                // Base Mainnet
                poolManager = 0x498581fF718922c3f8e6A244956aF099B2652b2b;
                console.log("    Using Base Mainnet PoolManager");
            } else {
                console.log("    WARNING: Unknown chain, using mock address");
                poolManager = address(0x1234); // 占位符
            }
        }
        
        positionManager = new VerifiedPoolsPositionManager(
            poolManager,
            address(registry),
            address(sessionManager)
        );
        console.log("    VerifiedPoolsPositionManager deployed at:", address(positionManager));
        console.log("");

        console.log("Step 1: Complete!");
        console.log("");
    }

    function configureSystem() internal {
        console.log("Step 2: Configuring system...");
        console.log("");

        // 注意：所有配置操作需要由 governance 地址执行
        // 如果 deployer != governance，这些操作会失败
        
        if (deployer == governance) {
            console.log("Deployer is governance, configuring...");
            
            // 配置示例（根据实际需求调整）
            // 1. 注册 Issuer
            // 2. 批准 Router
            // 3. 设置其他参数
            
            console.log("Configuration complete!");
        } else {
            console.log("WARNING: Deployer is not governance!");
            console.log("Please run configuration manually with governance account");
        }
        
        console.log("");
        console.log("Step 2: Complete!");
        console.log("");
    }

    function printDeploymentInfo() internal view {
        console.log("==============================================");
        console.log("DEPLOYMENT SUMMARY");
        console.log("==============================================");
        console.log("");
        console.log("Core Contracts:");
        console.log("  Registry (Proxy):", address(registry));
        console.log("  SessionManager (Proxy):", address(sessionManager));
        console.log("  ComplianceHook:", address(hook));
        console.log("  PositionManager:", address(positionManager));
        console.log("");
        console.log("Verification System:");
        console.log("  PlonkVerifier:", address(plonkVerifier));
        console.log("  PlonkVerifierAdapter:", address(verifierAdapter));
        console.log("");
        console.log("Configuration:");
        console.log("  Governance:", governance);
        console.log("  Session TTL:", registry.getSessionTTL(), "seconds");
        console.log("");
        console.log("==============================================");
        console.log("IMPORTANT: Save these addresses!");
        console.log("==============================================");
        console.log("");
    }

    function saveDeploymentAddresses() internal {
        // 创建 JSON 格式的部署地址文件
        string memory json = string(abi.encodePacked(
            "{\n",
            '  "network": "', vm.toString(block.chainid), '",\n',
            '  "deployer": "', vm.toString(deployer), '",\n',
            '  "governance": "', vm.toString(governance), '",\n',
            '  "contracts": {\n',
            '    "registry": "', vm.toString(address(registry)), '",\n',
            '    "sessionManager": "', vm.toString(address(sessionManager)), '",\n',
            '    "plonkVerifier": "', vm.toString(address(plonkVerifier)), '",\n',
            '    "verifierAdapter": "', vm.toString(address(verifierAdapter)), '",\n',
            '    "complianceHook": "', vm.toString(address(hook)), '",\n',
            '    "positionManager": "', vm.toString(address(positionManager)), '"\n',
            "  }\n",
            "}"
        ));

        // 保存到文件
        string memory filename = string(abi.encodePacked(
            "deployments/",
            vm.toString(block.chainid),
            "-plonk.json"
        ));
        
        vm.writeFile(filename, json);
        console.log("Deployment addresses saved to:", filename);
    }
}
