// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title SealGuardRegistry
 * @dev Core smart contract for SealGuard document verification system
 * Manages document registration, verification proofs, and access control
 */
contract SealGuardRegistry is Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    
    Counters.Counter private _documentIds;
    
    struct Document {
        uint256 id;
        string filecoinCID;
        bytes32 fileHash;
        bytes32 proofHash;
        address owner;
        uint256 timestamp;
        uint256 lastVerified;
        bool isVerified;
        string metadata; // JSON metadata
        uint256 fileSize;
        string documentType;
    }
    
    struct VerificationProof {
        uint256 documentId;
        bytes32 proofHash;
        uint256 timestamp;
        address verifier;
        bool isValid;
        string proofData; // JSON proof data
    }
    
    // Mappings
    mapping(uint256 => Document) public documents;
    mapping(address => uint256[]) public userDocuments;
    mapping(uint256 => VerificationProof[]) public documentProofs;
    mapping(bytes32 => uint256) public hashToDocumentId;
    
    // Events
    event DocumentRegistered(
        uint256 indexed documentId,
        address indexed owner,
        string filecoinCID,
        bytes32 fileHash
    );
    
    event DocumentVerified(
        uint256 indexed documentId,
        address indexed verifier,
        bytes32 proofHash,
        bool isValid
    );
    
    event OwnershipTransferred(
        uint256 indexed documentId,
        address indexed previousOwner,
        address indexed newOwner
    );
    
    // Modifiers
    modifier onlyDocumentOwner(uint256 documentId) {
        require(documents[documentId].owner == msg.sender, "Not document owner");
        _;
    }
    
    modifier documentExists(uint256 documentId) {
        require(documents[documentId].id != 0, "Document does not exist");
        _;
    }
    
    /**
     * @dev Register a new document on Filecoin
     * @param filecoinCID The Filecoin CID of the stored document
     * @param fileHash SHA256 hash of the original file
     * @param metadata JSON metadata string
     * @param fileSize Size of the file in bytes
     * @param documentType Type/category of the document
     */
    function registerDocument(
        string memory filecoinCID,
        bytes32 fileHash,
        string memory metadata,
        uint256 fileSize,
        string memory documentType
    ) external nonReentrant returns (uint256) {
        require(bytes(filecoinCID).length > 0, "Invalid Filecoin CID");
        require(fileHash != bytes32(0), "Invalid file hash");
        require(hashToDocumentId[fileHash] == 0, "Document already exists");
        
        _documentIds.increment();
        uint256 documentId = _documentIds.current();
        
        documents[documentId] = Document({
            id: documentId,
            filecoinCID: filecoinCID,
            fileHash: fileHash,
            proofHash: bytes32(0),
            owner: msg.sender,
            timestamp: block.timestamp,
            lastVerified: 0,
            isVerified: false,
            metadata: metadata,
            fileSize: fileSize,
            documentType: documentType
        });
        
        userDocuments[msg.sender].push(documentId);
        hashToDocumentId[fileHash] = documentId;
        
        emit DocumentRegistered(documentId, msg.sender, filecoinCID, fileHash);
        
        return documentId;
    }
    
    /**
     * @dev Submit a verification proof for a document
     * @param documentId The ID of the document to verify
     * @param proofHash Hash of the verification proof
     * @param proofData JSON string containing proof details
     * @param isValid Whether the proof is valid
     */
    function submitVerificationProof(
        uint256 documentId,
        bytes32 proofHash,
        string memory proofData,
        bool isValid
    ) external documentExists(documentId) nonReentrant {
        require(proofHash != bytes32(0), "Invalid proof hash");
        
        VerificationProof memory proof = VerificationProof({
            documentId: documentId,
            proofHash: proofHash,
            timestamp: block.timestamp,
            verifier: msg.sender,
            isValid: isValid,
            proofData: proofData
        });
        
        documentProofs[documentId].push(proof);
        
        // Update document verification status
        if (isValid) {
            documents[documentId].proofHash = proofHash;
            documents[documentId].lastVerified = block.timestamp;
            documents[documentId].isVerified = true;
        }
        
        emit DocumentVerified(documentId, msg.sender, proofHash, isValid);
    }
    
    /**
     * @dev Transfer ownership of a document
     * @param documentId The ID of the document
     * @param newOwner The address of the new owner
     */
    function transferDocumentOwnership(
        uint256 documentId,
        address newOwner
    ) external onlyDocumentOwner(documentId) {
        require(newOwner != address(0), "Invalid new owner address");
        require(newOwner != msg.sender, "Cannot transfer to self");
        
        address previousOwner = documents[documentId].owner;
        documents[documentId].owner = newOwner;
        
        // Update user document arrays
        _removeDocumentFromUser(previousOwner, documentId);
        userDocuments[newOwner].push(documentId);
        
        emit OwnershipTransferred(documentId, previousOwner, newOwner);
    }
    
    /**
     * @dev Get document details
     * @param documentId The ID of the document
     */
    function getDocument(uint256 documentId) 
        external 
        view 
        documentExists(documentId) 
        returns (Document memory) 
    {
        return documents[documentId];
    }
    
    /**
     * @dev Get all documents owned by a user
     * @param user The address of the user
     */
    function getUserDocuments(address user) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return userDocuments[user];
    }
    
    /**
     * @dev Get verification proofs for a document
     * @param documentId The ID of the document
     */
    function getDocumentProofs(uint256 documentId) 
        external 
        view 
        documentExists(documentId) 
        returns (VerificationProof[] memory) 
    {
        return documentProofs[documentId];
    }
    
    /**
     * @dev Get the latest verification proof for a document
     * @param documentId The ID of the document
     */
    function getLatestProof(uint256 documentId) 
        external 
        view 
        documentExists(documentId) 
        returns (VerificationProof memory) 
    {
        VerificationProof[] memory proofs = documentProofs[documentId];
        require(proofs.length > 0, "No proofs found");
        return proofs[proofs.length - 1];
    }
    
    /**
     * @dev Get total number of documents
     */
    function getTotalDocuments() external view returns (uint256) {
        return _documentIds.current();
    }
    
    /**
     * @dev Check if a document exists by file hash
     * @param fileHash The SHA256 hash of the file
     */
    function documentExistsByHash(bytes32 fileHash) external view returns (bool) {
        return hashToDocumentId[fileHash] != 0;
    }
    
    /**
     * @dev Get document ID by file hash
     * @param fileHash The SHA256 hash of the file
     */
    function getDocumentIdByHash(bytes32 fileHash) external view returns (uint256) {
        return hashToDocumentId[fileHash];
    }
    
    /**
     * @dev Internal function to remove document from user's array
     * @param user The user address
     * @param documentId The document ID to remove
     */
    function _removeDocumentFromUser(address user, uint256 documentId) internal {
        uint256[] storage docs = userDocuments[user];
        for (uint256 i = 0; i < docs.length; i++) {
            if (docs[i] == documentId) {
                docs[i] = docs[docs.length - 1];
                docs.pop();
                break;
            }
        }
    }
}