// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {ComplianceHook} from "../src/core/ComplianceHook.sol";

/**
 * @title MineHookAddress
 * @notice 爆破 CREATE2 salt 找到符合 Uniswap v4 位掩码要求的 Hook 地址
 * 
 * ComplianceHook 需要的权限:
 * - beforeSwap: bit 7 (0x80)
 * - beforeAddLiquidity: bit 11 (0x800)
 * - beforeRemoveLiquidity: bit 9 (0x200)
 * 总共: 0x0A80 (2688)
 */
contract MineHookAddress is Script {
    // Hook 权限位掩码
    uint160 constant BEFORE_SWAP_FLAG = 1 << 7;              // 0x80
    uint160 constant BEFORE_ADD_LIQUIDITY_FLAG = 1 << 11;    // 0x800
    uint160 constant BEFORE_REMOVE_LIQUIDITY_FLAG = 1 << 9;  // 0x200
    
    // 所有 Hook 位的掩码
    uint160 constant ALL_HOOK_MASK = uint160((1 << 14) - 1); // 0x3FFF
    
    // ComplianceHook 需要的位掩码
    uint160 constant REQUIRED_MASK = BEFORE_SWAP_FLAG | BEFORE_ADD_LIQUIDITY_FLAG | BEFORE_REMOVE_LIQUIDITY_FLAG;
    
    // CREATE2 部署器（EIP-1014）
    address constant CREATE2_DEPLOYER = 0x4e59b44847b379578588920cA78FbF26c0B4956C;
    
    function run() external {
        console.log("=================================================");
        console.log("Mining Hook Address with CREATE2");
        console.log("=================================================");
        console.log("Required mask: 0x%x (%d)", REQUIRED_MASK, REQUIRED_MASK);
        console.log("");
        
        // 从环境变量读取参数
        address registry = vm.envAddress("REGISTRY_ADDRESS");
        address sessionManager = vm.envAddress("SESSION_MANAGER_ADDRESS");
        address deployer = vm.envAddress("DEPLOYER_ADDRESS");
        
        console.log("Registry:        %s", registry);
        console.log("SessionManager:  %s", sessionManager);
        console.log("Deployer:        %s", deployer);
        console.log("");
        
        // 计算 creation code
        bytes memory creationCode = abi.encodePacked(
            type(ComplianceHook).creationCode,
            abi.encode(registry, sessionManager)
        );
        
        bytes32 creationCodeHash = keccak256(creationCode);
        console.log("Creation code hash:");
        console.logBytes32(creationCodeHash);
        console.log("");
        
        // 开始爆破
        console.log("Mining salt... (this may take a while)");
        console.log("");
        
        uint256 attempts = 0;
        bytes32 salt;
        address predictedAddress;
        
        for (uint256 i = 0; i < type(uint256).max; i++) {
            salt = bytes32(i);
            
            // 预测地址 (CREATE2)
            predictedAddress = address(
                uint160(
                    uint256(
                        keccak256(
                            abi.encodePacked(
                                bytes1(0xff),
                                deployer,
                                salt,
                                creationCodeHash
                            )
                        )
                    )
                )
            );
            
            attempts++;
            
            // 检查地址低 14 位是否匹配
            uint160 addressBits = uint160(predictedAddress) & ALL_HOOK_MASK;
            
            if (addressBits == REQUIRED_MASK) {
                console.log("SUCCESS! Found valid address after %d attempts", attempts);
                console.log("");
                console.log("Salt:     0x%x", uint256(salt));
                console.log("Address:  %s", predictedAddress);
                console.log("");
                console.log("Address bits (low 14): 0x%x", addressBits);
                console.log("Required mask:         0x%x", REQUIRED_MASK);
                console.log("");
                console.log("Verification:");
                console.log("  beforeSwap (bit 7):             %s", (addressBits & BEFORE_SWAP_FLAG) != 0 ? "YES" : "NO");
                console.log("  beforeAddLiquidity (bit 11):    %s", (addressBits & BEFORE_ADD_LIQUIDITY_FLAG) != 0 ? "YES" : "NO");
                console.log("  beforeRemoveLiquidity (bit 9):  %s", (addressBits & BEFORE_REMOVE_LIQUIDITY_FLAG) != 0 ? "YES" : "NO");
                console.log("");
                
                // 保存到环境变量文件
                string memory output = string.concat(
                    "HOOK_SALT=", vm.toString(salt), "\n",
                    "HOOK_ADDRESS=", vm.toString(predictedAddress), "\n"
                );
                
                vm.writeFile(".hook-address", output);
                console.log("Saved to .hook-address file");
                
                return;
            }
            
            // 每 100k 次打印进度
            if (attempts % 100000 == 0) {
                console.log("Attempts: %d...", attempts);
            }
        }
        
        console.log("Failed to find valid address after %d attempts", attempts);
        revert("Mining failed");
    }
}
