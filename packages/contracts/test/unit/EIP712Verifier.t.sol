// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "../../src/libraries/EIP712Verifier.sol";

contract EIP712VerifierTest is Test {
    EIP712Verifier public verifier;

    uint256 public alicePrivateKey = 0xa11ce;
    address public alice;

    function setUp() public {
        verifier = new EIP712Verifier();
        
        // 从私钥派生地址（确保一致性）
        alice = vm.addr(alicePrivateKey);
        vm.label(alice, "alice");
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

    function test_RevertWhen_VerifySwapPermit_WrongSigner() public {
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

        vm.expectRevert(EIP712Verifier.InvalidSignature.selector);
        verifier.verifySwapPermit(alice, deadline, nonce, signature);
    }

    function test_RevertWhen_VerifySwapPermit_Expired() public {
        uint256 deadline = block.timestamp - 1;
        uint256 nonce = verifier.getNonce(alice);

        bytes memory signature = _signSwapPermit(
            alicePrivateKey,
            alice,
            deadline,
            nonce
        );

        vm.expectRevert(EIP712Verifier.SignatureExpired.selector);
        verifier.verifySwapPermit(alice, deadline, nonce, signature);
    }

    function test_RevertWhen_VerifySwapPermit_InvalidNonce() public {
        uint256 deadline = block.timestamp + 1 hours;
        uint256 wrongNonce = 999;

        bytes memory signature = _signSwapPermit(
            alicePrivateKey,
            alice,
            deadline,
            wrongNonce
        );

        // 使用错误的 nonce 会触发 InvalidNonce 错误
        vm.expectRevert(EIP712Verifier.InvalidNonce.selector);
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

        // EIP-712 验证 (含一次 20000 gas nonce 冷写入) 应该在合理范围内 (< 35000 gas)
        assertLt(gasUsed, 35000, "EIP-712 verification too expensive");
    }
}
