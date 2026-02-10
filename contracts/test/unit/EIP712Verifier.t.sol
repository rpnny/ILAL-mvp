// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "../../src/libraries/EIP712Verifier.sol";

contract EIP712VerifierTest is Test {
    EIP712Verifier public verifier;

    address public alice = makeAddr("alice");
    uint256 public alicePrivateKey = 0xa11ce;

    function setUp() public {
        verifier = new EIP712Verifier();
        
        // 设置 alice 的私钥
        vm.label(vm.addr(alicePrivateKey), "alice");
    }

    // ============ 辅助函数 ============

    function _signSwapPermit(
        uint256 privateKey,
        address user,
        uint256 deadline,
        uint256 nonce
    ) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(
            abi.encode(
                verifier.SWAP_PERMIT_TYPEHASH(),
                user,
                deadline,
                nonce
            )
        );

        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                verifier.getDomainSeparator(),
                structHash
            )
        );

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
        return abi.encodePacked(r, s, v);
    }

    // ============ SwapPermit 测试 ============

    function test_VerifySwapPermit_Success() public {
        uint256 deadline = block.timestamp + 1 hours;
        uint256 nonce = verifier.getNonce(alice);

        bytes memory signature = _signSwapPermit(
            alicePrivateKey,
            alice,
            deadline,
            nonce
        );

        bool valid = verifier.verifySwapPermit(
            alice,
            deadline,
            nonce,
            signature
        );

        assertTrue(valid);
        assertEq(verifier.getNonce(alice), nonce + 1);
    }

    function testFail_VerifySwapPermit_WrongSigner() public {
        uint256 deadline = block.timestamp + 1 hours;
        uint256 nonce = verifier.getNonce(alice);

        // Bob 签名但声称是 Alice
        uint256 bobPrivateKey = 0xb0b;
        bytes memory signature = _signSwapPermit(
            bobPrivateKey,
            alice,
            deadline,
            nonce
        );

        verifier.verifySwapPermit(alice, deadline, nonce, signature);
    }

    function testFail_VerifySwapPermit_Expired() public {
        uint256 deadline = block.timestamp - 1;
        uint256 nonce = verifier.getNonce(alice);

        bytes memory signature = _signSwapPermit(
            alicePrivateKey,
            alice,
            deadline,
            nonce
        );

        verifier.verifySwapPermit(alice, deadline, nonce, signature);
    }

    function testFail_VerifySwapPermit_InvalidNonce() public {
        uint256 deadline = block.timestamp + 1 hours;
        uint256 wrongNonce = 999;

        bytes memory signature = _signSwapPermit(
            alicePrivateKey,
            alice,
            deadline,
            wrongNonce
        );

        verifier.verifySwapPermit(alice, deadline, wrongNonce, signature);
    }

    function test_VerifySwapPermit_ReplayPrevented() public {
        uint256 deadline = block.timestamp + 1 hours;
        uint256 nonce = verifier.getNonce(alice);

        bytes memory signature = _signSwapPermit(
            alicePrivateKey,
            alice,
            deadline,
            nonce
        );

        // 第一次验证成功
        verifier.verifySwapPermit(alice, deadline, nonce, signature);

        // 第二次使用相同签名应该失败
        vm.expectRevert(EIP712Verifier.InvalidNonce.selector);
        verifier.verifySwapPermit(alice, deadline, nonce, signature);
    }

    // ============ View 函数测试 ============

    function test_VerifySwapPermitView() public view {
        uint256 deadline = block.timestamp + 1 hours;
        uint256 nonce = verifier.getNonce(alice);

        bytes memory signature = _signSwapPermit(
            alicePrivateKey,
            alice,
            deadline,
            nonce
        );

        bool valid = verifier.verifySwapPermitView(
            alice,
            deadline,
            nonce,
            signature
        );

        assertTrue(valid);
        // View 函数不应该修改 nonce
        assertEq(verifier.getNonce(alice), nonce);
    }

    // ============ 工具函数测试 ============

    function test_GetNonce() public view {
        uint256 nonce = verifier.getNonce(alice);
        assertEq(nonce, 0);
    }

    function test_GetDomainSeparator() public view {
        bytes32 separator = verifier.getDomainSeparator();
        assertTrue(separator != bytes32(0));
    }

    // ============ Gas 优化测试 ============

    function test_VerifySwapPermit_Gas() public {
        uint256 deadline = block.timestamp + 1 hours;
        uint256 nonce = verifier.getNonce(alice);

        bytes memory signature = _signSwapPermit(
            alicePrivateKey,
            alice,
            deadline,
            nonce
        );

        uint256 gasBefore = gasleft();
        verifier.verifySwapPermit(alice, deadline, nonce, signature);
        uint256 gasUsed = gasBefore - gasleft();

        // EIP-712 验证应该在合理范围内 (< 10000 gas)
        assertLt(gasUsed, 10000, "EIP-712 verification too expensive");
    }
}
