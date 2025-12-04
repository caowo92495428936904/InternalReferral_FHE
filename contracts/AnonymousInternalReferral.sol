// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint32, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract AnonymousInternalReferral is SepoliaConfig {
    struct EncryptedReferral {
        uint256 id;
        euint32 encryptedCandidate;  // Encrypted candidate details
        euint32 encryptedPosition;   // Encrypted position ID
        uint256 timestamp;
    }
    
    struct DecryptedReferral {
        string candidate;
        string position;
        bool isRevealed;
    }

    uint256 public referralCount;
    mapping(uint256 => EncryptedReferral) public encryptedReferrals;
    mapping(uint256 => DecryptedReferral) public decryptedReferrals;
    mapping(string => euint32) private encryptedPositionCount;
    string[] private positionList;
    
    mapping(uint256 => uint256) private requestToReferralId;
    
    event ReferralSubmitted(uint256 indexed id, uint256 timestamp);
    event DecryptionRequested(uint256 indexed id);
    event ReferralDecrypted(uint256 indexed id);

    // Access control for HR role
    address public hrManager;
    mapping(address => bool) private isHR;
    
    constructor() {
        hrManager = msg.sender;
        isHR[msg.sender] = true;
    }
    
    modifier onlyHR() {
        require(isHR[msg.sender], "HR only");
        _;
    }

    /// @notice Submit new encrypted referral
    function submitEncryptedReferral(
        euint32 encryptedCandidate,
        euint32 encryptedPosition
    ) public {
        referralCount += 1;
        uint256 newId = referralCount;
        
        encryptedReferrals[newId] = EncryptedReferral({
            id: newId,
            encryptedCandidate: encryptedCandidate,
            encryptedPosition: encryptedPosition,
            timestamp: block.timestamp
        });
        
        decryptedReferrals[newId] = DecryptedReferral({
            candidate: "",
            position: "",
            isRevealed: false
        });
        
        emit ReferralSubmitted(newId, block.timestamp);
    }

    /// @notice Request referral decryption
    function requestReferralDecryption(uint256 referralId) public onlyHR {
        EncryptedReferral storage referral = encryptedReferrals[referralId];
        require(!decryptedReferrals[referralId].isRevealed, "Already decrypted");
        
        bytes32[] memory ciphertexts = new bytes32[](2);
        ciphertexts[0] = FHE.toBytes32(referral.encryptedCandidate);
        ciphertexts[1] = FHE.toBytes32(referral.encryptedPosition);
        
        uint256 reqId = FHE.requestDecryption(ciphertexts, this.decryptReferral.selector);
        requestToReferralId[reqId] = referralId;
        
        emit DecryptionRequested(referralId);
    }

    /// @notice Process decrypted referral data
    function decryptReferral(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory proof
    ) public {
        uint256 referralId = requestToReferralId[requestId];
        require(referralId != 0, "Invalid request");
        
        EncryptedReferral storage eReferral = encryptedReferrals[referralId];
        DecryptedReferral storage dReferral = decryptedReferrals[referralId];
        require(!dReferral.isRevealed, "Already decrypted");
        
        FHE.checkSignatures(requestId, cleartexts, proof);
        
        string[] memory results = abi.decode(cleartexts, (string[]));
        
        dReferral.candidate = results[0];
        dReferral.position = results[1];
        dReferral.isRevealed = true;
        
        if (FHE.isInitialized(encryptedPositionCount[dReferral.position]) == false) {
            encryptedPositionCount[dReferral.position] = FHE.asEuint32(0);
            positionList.push(dReferral.position);
        }
        encryptedPositionCount[dReferral.position] = FHE.add(
            encryptedPositionCount[dReferral.position], 
            FHE.asEuint32(1)
        );
        
        emit ReferralDecrypted(referralId);
    }

    /// @notice Add new HR manager
    function addHR(address newHR) public {
        require(msg.sender == hrManager, "Not authorized");
        isHR[newHR] = true;
    }

    /// @notice Get decrypted referral details
    function getDecryptedReferral(uint256 referralId) public view onlyHR returns (
        string memory candidate,
        string memory position,
        bool isRevealed
    ) {
        DecryptedReferral storage r = decryptedReferrals[referralId];
        return (r.candidate, r.position, r.isRevealed);
    }

    /// @notice Get encrypted position count
    function getEncryptedPositionCount(string memory position) public view returns (euint32) {
        return encryptedPositionCount[position];
    }
}