// SPDX-License-Identifier: LGPL-3.0
pragma solidity ^0.8.22;

import "@safe-global/safe-contracts/contracts/common/Enum.sol";
import "@safe-global/safe-contracts/contracts/Safe.sol";

contract IDRPQuorumModule {
    bytes32 public immutable PERMIT_TYPEHASH =
        keccak256(
            "MultiQuorumSafeModule(uint256 amount,uint256 nonce,uint256 deadline,string operation)"
        );

    address public immutable safeAddress;
    address public immutable tokenAddress;
    address public immutable depositoryAccount;

    enum OperationType {
        Mint,
        Burn,
        Freeze,
        Unfreeze
    }

    struct QuorumRule {
        uint256 minAmount;
        uint256 maxAmount;
        address[] requiredSigners;
    }

    mapping(OperationType => QuorumRule[]) public quorumRules;
    mapping(address => uint256) public nonces;

    event OperationExecuted(
        OperationType operation,
        uint256 amount,
        address indexed executor
    );

    constructor(
        address _safeAddress,
        address _tokenAddress,
        address _depositoryAccount
    ) {
        safeAddress = _safeAddress;
        tokenAddress = _tokenAddress;
        depositoryAccount = _depositoryAccount;
    }

    function setQuorumRules(
        OperationType _operation,
        QuorumRule[] calldata _rules
    ) external {
        delete quorumRules[_operation];
        for (uint256 i = 0; i < _rules.length; i++) {
            quorumRules[_operation].push(_rules[i]);
        }
    }

    function executeOperation(
        OperationType operation,
        uint256 amount,
        uint256 deadline,
        bytes memory signatures
    ) public {
        require(deadline >= block.timestamp, "Signature expired");
        QuorumRule memory rule = getRequiredSigners(operation, amount);

        bytes32 signatureData = keccak256(
            abi.encode(
                PERMIT_TYPEHASH,
                amount,
                nonces[msg.sender]++,
                deadline,
                operation
            )
        );
        bytes32 hash = keccak256(
            abi.encodePacked("\x19\x01", getDomainSeparator(), signatureData)
        );

        Safe(payable(safeAddress)).checkSignatures(
            hash,
            abi.encodePacked(signatureData),
            signatures
        );

        bytes memory data;
        if (operation == OperationType.Mint) {
            data = abi.encodeWithSignature(
                "mint(address,uint256)",
                depositoryAccount,
                amount
            );
        } else if (operation == OperationType.Burn) {
            data = abi.encodeWithSignature(
                "burn(address,uint256)",
                msg.sender,
                amount
            );
        } else if (
            operation == OperationType.Freeze ||
            operation == OperationType.Unfreeze
        ) {
            data = abi.encodeWithSignature(
                operation == OperationType.Freeze
                    ? "freeze(address)"
                    : "unfreeze(address)",
                msg.sender
            );
        }

        require(
            Safe(payable(safeAddress)).execTransactionFromModule(
                tokenAddress,
                0,
                data,
                Enum.Operation.Call
            ),
            "Transaction failed"
        );

        emit OperationExecuted(operation, amount, msg.sender);
    }

    function getRequiredSigners(
        OperationType operation,
        uint256 amount
    ) public view returns (QuorumRule memory) {
        QuorumRule[] memory rules = quorumRules[operation];
        for (uint256 i = 0; i < rules.length; i++) {
            if (amount >= rules[i].minAmount && amount < rules[i].maxAmount) {
                return rules[i];
            }
        }
        revert("No quorum rule found for amount");
    }

    function getDomainSeparator() private view returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    keccak256(
                        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                    ),
                    keccak256(bytes("MultiQuorumSafeModule")),
                    keccak256(bytes("1")),
                    block.chainid,
                    address(this)
                )
            );
    }
}
