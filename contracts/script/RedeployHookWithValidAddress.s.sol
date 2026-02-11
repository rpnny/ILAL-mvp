// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {ComplianceHook} from "../src/core/ComplianceHook.sol";
import {Registry} from "../src/core/Registry.sol";
import {SessionManager} from "../src/core/SessionManager.sol";
import {VerifiedPoolsPositionManager} from "../src/core/VerifiedPoolsPositionManager.sol";

/**
 * @title RedeployHookWithValidAddress
 * @notice 使用 CREATE2 部署 ComplianceHook 到符合 Uniswap v4 位掩码的地址
 * 
 * 使用方法:
 * 1. source .env
 * 2. forge script script/RedeployHookWithValidAddress.s.sol:RedeployHookWithValidAddress \
 *    --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast -vvv
 */
contract RedeployHookWithValidAddress is Script {
    // Hook 权限位
    uint160 constant BEFORE_SWAP_FLAG = 1 << 7;
    uint160 constant BEFORE_ADD_LIQUIDITY_FLAG = 1 << 11;
    uint160 constant BEFORE_REMOVE_LIQUIDITY_FLAG = 1 << 9;
    uint160 constant REQUIRED_MASK = 0x0A80; // 2688
    uint160 constant ALL_HOOK_MASK = 0x3FFF;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        address registry = vm.envOr("REGISTRY_ADDRESS", address(0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD));
        address sessionManager = vm.envOr("SESSION_MANAGER_ADDRESS", address(0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2));
        address poolManager = vm.envOr("POOL_MANAGER_ADDRESS", address(0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408));
        
        console.log("=======================================================");
        console.log("Redeploying ComplianceHook with Valid Address");
        console.log("=======================================================");
        console.log("Deployer:       ", deployer);
        console.log("Registry:       ", registry);
        console.log("SessionManager: ", sessionManager);
        console.log("PoolManager:    ", poolManager);
        console.log("");
        console.log("Required mask: 0x%x", REQUIRED_MASK);
        console.log("");

        // 计算 creation code
        bytes memory creationCode = abi.encodePacked(
            type(ComplianceHook).creationCode,
            abi.encode(registry, sessionManager)
        );
        bytes32 creationCodeHash = keccak256(creationCode);

        console.log("Mining salt for valid Hook address...");
        console.log("");

        // 挖掘有效的 salt
        (bytes32 salt, address hookAddress) = _mineSalt(deployer, creationCodeHash);

        console.log("Found valid address!");
        console.log("Salt:    ", vm.toString(salt));
        console.log("Address: ", hookAddress);
        console.log("");

        // 开始部署
        vm.startBroadcast(deployerPrivateKey);

        // 使用 CREATE2 部署 ComplianceHook
        // 注意：实际地址由 deployer (msg.sender) 决定
        ComplianceHook hook;
        address deployedAddress;
        assembly {
            deployedAddress := create2(0, add(creationCode, 0x20), mload(creationCode), salt)
        }
        require(deployedAddress != address(0), "Deployment failed");
        hook = ComplianceHook(deployedAddress);
        
        console.log("Deployed ComplianceHook at:", address(hook));
        
        // 验证地址位掩码
        uint160 actualBits = uint160(address(hook)) & ALL_HOOK_MASK;
        require(actualBits == REQUIRED_MASK, "Address bits validation failed");

        console.log("ComplianceHook deployed at:", address(hook));

        // 重新部署 PositionManager（需要引用新的 Hook）
        VerifiedPoolsPositionManager newPositionManager = new VerifiedPoolsPositionManager(
            poolManager,
            registry,
            sessionManager
        );
        console.log("PositionManager deployed at:", address(newPositionManager));

        vm.stopBroadcast();

        // 保存部署结果
        string memory json = string.concat(
            '{\n',
            '  "network": "base-sepolia",\n',
            '  "deployedAt": "', vm.toString(block.timestamp), '",\n',
            '  "contracts": {\n',
            '    "complianceHook": "', vm.toString(address(hook)), '",\n',
            '    "positionManager": "', vm.toString(address(newPositionManager)), '",\n',
            '    "hookSalt": "', vm.toString(salt), '"\n',
            '  }\n',
            '}\n'
        );
        vm.writeFile("deployments/hook-redeploy.json", json);

        console.log("");
        console.log("=======================================================");
        console.log("Deployment Complete!");
        console.log("=======================================================");
        console.log("Next steps:");
        console.log("1. Update frontend/lib/contracts.ts");
        console.log("2. Update bot/config.yaml");
        console.log("3. Initialize pool with new hook address");
        console.log("4. Run tests: cd scripts/system-test && npx tsx grand-final.ts");
    }

    /**
     * 挖掘有效的 salt
     */
    function _mineSalt(address deployer, bytes32 creationCodeHash)
        internal
        view
        returns (bytes32 salt, address hookAddress)
    {
        for (uint256 i = 0; i < type(uint256).max; i++) {
            salt = bytes32(i);

            // 计算 CREATE2 地址
            hookAddress = address(
                uint160(
                    uint256(
                        keccak256(
                            abi.encodePacked(bytes1(0xff), deployer, salt, creationCodeHash)
                        )
                    )
                )
            );

            // 检查低 14 位
            uint160 lowBits = uint160(hookAddress) & ALL_HOOK_MASK;
            if (lowBits == REQUIRED_MASK) {
                return (salt, hookAddress);
            }

            // 每 50k 打印进度
            if (i % 50000 == 0 && i > 0) {
                console.log("Attempts: %d...", i);
            }
        }

        revert("Mining failed");
    }
}
