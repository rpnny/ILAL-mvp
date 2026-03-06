// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {ComplianceHook} from "../src/core/ComplianceHook.sol";
import {VerifiedPoolsPositionManager} from "../src/core/VerifiedPoolsPositionManager.sol";

/**
 * @title HookFactory — deploys ComplianceHook via CREATE2 from a deterministic factory address
 */
contract HookFactory {
    event Deployed(address hook, bytes32 salt);

    function deploy(
        bytes32 salt,
        address poolManager,
        address registry,
        address sessionManager
    ) external returns (address) {
        ComplianceHook hook = new ComplianceHook{salt: salt}(poolManager, registry, sessionManager);
        emit Deployed(address(hook), salt);
        return address(hook);
    }

    function computeAddress(
        bytes32 salt,
        address poolManager,
        address registry,
        address sessionManager
    ) external view returns (address) {
        bytes32 codeHash = keccak256(
            abi.encodePacked(
                type(ComplianceHook).creationCode,
                abi.encode(poolManager, registry, sessionManager)
            )
        );
        return address(
            uint160(uint256(keccak256(abi.encodePacked(bytes1(0xff), address(this), salt, codeHash))))
        );
    }
}

contract DeployHookV2 is Script {
    uint160 constant REQUIRED_MASK = 0x0A80;
    uint160 constant ALL_HOOK_MASK = 0x3FFF;

    address constant POOL_MANAGER = 0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408;
    address constant REGISTRY = 0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD;
    address constant SESSION_MANAGER = 0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");

        console.log("=== Deploy ComplianceHook V2 ===");
        console.log("PoolManager:   ", POOL_MANAGER);
        console.log("Registry:      ", REGISTRY);
        console.log("SessionManager:", SESSION_MANAGER);

        vm.startBroadcast(pk);

        // Step 1: deploy factory
        HookFactory factory = new HookFactory();
        console.log("Factory deployed:", address(factory));

        // Step 2: mine salt against factory address
        bytes32 creationCodeHash = keccak256(
            abi.encodePacked(
                type(ComplianceHook).creationCode,
                abi.encode(POOL_MANAGER, REGISTRY, SESSION_MANAGER)
            )
        );

        (bytes32 salt, address predicted) = _mineSalt(address(factory), creationCodeHash);
        console.log("Salt found:", vm.toString(salt));
        console.log("Predicted: ", predicted);

        // Step 3: deploy hook via factory
        address hookAddr = factory.deploy(salt, POOL_MANAGER, REGISTRY, SESSION_MANAGER);
        console.log("Hook deployed:", hookAddr);

        // Validate bitmask
        uint160 bits = uint160(hookAddr) & ALL_HOOK_MASK;
        require(bits == REQUIRED_MASK, "Bitmask mismatch");
        console.log("Bitmask OK");

        // Step 4: deploy new PositionManager
        VerifiedPoolsPositionManager pm = new VerifiedPoolsPositionManager(
            POOL_MANAGER, address(REGISTRY), address(SESSION_MANAGER)
        );
        console.log("PositionManager:", address(pm));

        vm.stopBroadcast();

        // Save deployment result
        string memory json = string.concat(
            '{\n',
            '  "network": "base-sepolia",\n',
            '  "contracts": {\n',
            '    "complianceHook": "', vm.toString(hookAddr), '",\n',
            '    "hookFactory": "', vm.toString(address(factory)), '",\n',
            '    "positionManager": "', vm.toString(address(pm)), '",\n',
            '    "salt": "', vm.toString(salt), '"\n',
            '  }\n',
            '}\n'
        );
        vm.writeFile("deployments/hook-v2-deploy.json", json);
        console.log("Saved to deployments/hook-v2-deploy.json");
    }

    function _mineSalt(address factory, bytes32 codeHash)
        internal
        pure
        returns (bytes32 salt, address addr)
    {
        for (uint256 i = 0; i < type(uint256).max; i++) {
            salt = bytes32(i);
            addr = address(
                uint160(uint256(keccak256(abi.encodePacked(bytes1(0xff), factory, salt, codeHash))))
            );
            if ((uint160(addr) & ALL_HOOK_MASK) == REQUIRED_MASK) {
                return (salt, addr);
            }
        }
        revert("Mining failed");
    }
}
