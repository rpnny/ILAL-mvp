// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {ComplianceHook} from "../src/core/ComplianceHook.sol";

/**
 * @title DeployHookViaCREATE2
 * @notice 使用标准 CREATE2 Deployer 部署 ComplianceHook
 * 
 * 使用标准的 CREATE2 Deployer: 0x4e59b44847b379578588920cA78FbF26c0B4956C
 * 已找到的有效 Salt: 0x000000000000000000000000000000000000000000000000000000000000649d
 * 预期地址: 0x9f8E60C1E099DD7e8eca12316a107496D42c8a80
 */
contract DeployHookViaCREATE2 is Script {
    // 标准 CREATE2 Deployer (所有链都有)
    address constant CREATE2_DEPLOYER = 0x4e59b44847b379578588920cA78FbF26c0B4956C;
    
    // 已挖掘到的 salt (v2 - 完整 IHooks 接口)
    bytes32 constant MINED_SALT = 0x00000000000000000000000000000000000000000000000000000000000014e1;
    
    // 预期地址 (v2 - 完整 IHooks 接口)
    address constant EXPECTED_ADDRESS = 0xDeDcFDF10b03AB45eEbefD2D91EDE66D9E5c8a80;
    
    // Hook 权限位
    uint160 constant REQUIRED_MASK = 0x0A80;
    uint160 constant ALL_HOOK_MASK = 0x3FFF;

    function run() external {
        address registry = 0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD;
        address sessionManager = 0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2;
        
        console.log("=======================================================");
        console.log("Deploying ComplianceHook via CREATE2 Deployer");
        console.log("=======================================================");
        console.log("Registry:        ", registry);
        console.log("SessionManager:  ", sessionManager);
        console.log("Expected address:", EXPECTED_ADDRESS);
        console.log("Salt:            ", vm.toString(MINED_SALT));
        console.log("");

        // 计算 init code = creation code + constructor args
        bytes memory initCode = abi.encodePacked(
            type(ComplianceHook).creationCode,
            abi.encode(registry, sessionManager)
        );

        console.log("Init code length: %d bytes", initCode.length);
        console.log("Init code hash:");
        console.logBytes32(keccak256(initCode));
        console.log("");

        // 验证预期地址
        address predicted = address(
            uint160(
                uint256(
                    keccak256(
                        abi.encodePacked(
                            bytes1(0xff),
                            CREATE2_DEPLOYER,
                            MINED_SALT,
                            keccak256(initCode)
                        )
                    )
                )
            )
        );

        console.log("Predicted address:", predicted);
        require(predicted == EXPECTED_ADDRESS, "Prediction mismatch");
        console.log("Prediction matches! ");
        console.log("");

        // 开始部署
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // 调用 CREATE2 Deployer
        (bool success, ) = CREATE2_DEPLOYER.call{value: 0}(
            abi.encodePacked(MINED_SALT, initCode)
        );

        require(success, "CREATE2 deployment failed");
        address deployed = EXPECTED_ADDRESS;

        vm.stopBroadcast();

        console.log("Deployed at:", deployed);
        console.log("");

        // 验证地址
        require(deployed == EXPECTED_ADDRESS, "Address mismatch");
        require(deployed.code.length > 0, "No code at address");

        // 验证位掩码
        uint160 actualBits = uint160(deployed) & ALL_HOOK_MASK;
        console.log("Address bits validation:");
        console.log("  Low 14 bits: 0x%x", actualBits);
        console.log("  Required:    0x%x", REQUIRED_MASK);
        console.log("  Match:       %s", actualBits == REQUIRED_MASK ? "YES" : "NO");
        require(actualBits == REQUIRED_MASK, "Bits validation failed");

        console.log("");
        console.log("=======================================================");
        console.log("SUCCESS! ComplianceHook deployed at:");
        console.log(deployed);
        console.log("=======================================================");
    }
}
