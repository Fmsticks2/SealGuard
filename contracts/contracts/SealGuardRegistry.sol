// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./SealGuardAccessControl.sol";
import "./SealGuardMultiSig.sol";

/**
 * @title SealGuardRegistry
 * @dev Core smart contract for SealGuard document verification system
 * Manages document registration, verification proofs, and access control
 */
contract SealGuardRegistry is Ownable, ReentrancyGuard {
    uint256 private _documentIds;
    SealGuardAccessControl public accessControl;
    SealGuardMultiSig public multiSig;
    
    // Multi-signature requirements
    mapping(uint256 => bool) public requiresMultiSig; // document ID -> requires multi-sig
    mapping(string => bool) public typeRequiresMultiSig; // document type -> requires multi-sig
    mapping(uint256 => bool) public multiSigVerified; // document ID -> multi-sig verified
    
    // Document lifecycle states
    enum DocumentLifecycle {
        PENDING,
        PROCESSING,
        VERIFIED,
        REJECTED,
        EXPIRED,
        ARCHIVED
    }
    
    // Automated verification settings
    struct AutoVerificationConfig {
        bool enabled;
        uint256 timeThreshold; // Auto-verify after X seconds if no manual verification
        uint256 consensusThreshold; // Number of verifiers needed for consensus
        bool requiresManualApproval; // Whether manual approval is always required
        uint256 maxAutoVerifications; // Max auto-verifications per day
    }
    
    // Verification trigger types
    enum TriggerType {
        MANUAL,
        TIME_BASED,
        CONSENSUS_BASED,
        THRESHOLD_BASED,
        AUTOMATED
    }
    
    // Auto-verification mappings
    mapping(string => AutoVerificationConfig) public autoVerificationConfigs; // document type -> config
    mapping(uint256 => uint256) public autoVerificationCount; // document ID -> count
    mapping(uint256 => uint256) public lastAutoVerification; // document ID -> timestamp
    mapping(uint256 => TriggerType) public verificationTriggers; // document ID -> trigger type
    
    // Document expiration settings
    mapping(string => uint256) public documentTypeExpiry; // document type -> expiry duration in seconds
    mapping(uint256 => uint256) public documentExpiry; // document ID -> expiry timestamp
    
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
        DocumentLifecycle lifecycle;
        uint256 expiresAt;
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
    
    event AutoVerificationTriggered(
        uint256 indexed documentId,
        TriggerType triggerType,
        address indexed triggeredBy,
        uint256 timestamp
    );
    
    event AutoVerificationConfigUpdated(
        string indexed documentType,
        bool enabled,
        uint256 timeThreshold,
        uint256 consensusThreshold
    );
    
    event VerificationThresholdReached(
        uint256 indexed documentId,
        uint256 verifierCount,
        uint256 threshold
    );
    
    event MultiSigRequirementSet(
        uint256 indexed documentId,
        bool required,
        string documentType
    );
    
    event MultiSigVerificationCompleted(
        uint256 indexed documentId,
        address indexed multiSigContract,
        uint256 proposalId
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
    
    constructor(address initialOwner, address _accessControl) Ownable(initialOwner) {
        accessControl = SealGuardAccessControl(_accessControl);
        
        // Set default expiry times for document types (in seconds)
        documentTypeExpiry["legal"] = 365 days * 7; // 7 years for legal documents
        documentTypeExpiry["financial"] = 365 days * 10; // 10 years for financial documents
        documentTypeExpiry["medical"] = 365 days * 30; // 30 years for medical records
        documentTypeExpiry["identity"] = 365 days * 10; // 10 years for identity documents
        documentTypeExpiry["contract"] = 365 days * 20; // 20 years for contracts
        documentTypeExpiry["default"] = 365 days * 5; // 5 years default
        
        // Initialize auto-verification configs
        _initializeAutoVerificationConfigs();
        
        // Initialize multi-signature requirements
        _initializeMultiSigRequirements();
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
        
        _documentIds++;
        uint256 documentId = _documentIds;
        
        // Calculate expiry time based on document type
        uint256 expiryDuration = documentTypeExpiry[documentType];
        if (expiryDuration == 0) {
            expiryDuration = documentTypeExpiry["default"];
        }
        uint256 expiresAt = block.timestamp + expiryDuration;
        
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
            documentType: documentType,
            lifecycle: DocumentLifecycle.PENDING,
            expiresAt: expiresAt
        });
        
        documentExpiry[documentId] = expiresAt;
        
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
        require(
            accessControl.hasRoleOrHigher(msg.sender, accessControl.VERIFIER_ROLE()),
            "Insufficient permissions to verify"
        );
        require(
            documents[documentId].lifecycle != DocumentLifecycle.EXPIRED &&
            documents[documentId].lifecycle != DocumentLifecycle.ARCHIVED,
            "Document is expired or archived"
        );
        
        // Update document lifecycle to processing
        documents[documentId].lifecycle = DocumentLifecycle.PROCESSING;
        
        VerificationProof memory proof = VerificationProof({
            documentId: documentId,
            proofHash: proofHash,
            timestamp: block.timestamp,
            verifier: msg.sender,
            isValid: isValid,
            proofData: proofData
        });
        
        documentProofs[documentId].push(proof);
        
        // Update document verification status and lifecycle
        if (isValid) {
            documents[documentId].proofHash = proofHash;
            documents[documentId].lastVerified = block.timestamp;
            documents[documentId].isVerified = true;
            documents[documentId].lifecycle = DocumentLifecycle.VERIFIED;
        } else {
            documents[documentId].lifecycle = DocumentLifecycle.REJECTED;
        }
        
        // Check if this triggers automated verification
        _checkAutomatedVerificationTriggers(documentId);
        
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
        return _documentIds;
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
     * @dev Archive a document (only owner or admin)
     * @param documentId The document ID to archive
     */
    function archiveDocument(uint256 documentId) external documentExists(documentId) {
        require(
            documents[documentId].owner == msg.sender ||
            accessControl.hasRoleOrHigher(msg.sender, accessControl.ADMIN_ROLE()),
            "Only owner or admin can archive"
        );
        documents[documentId].lifecycle = DocumentLifecycle.ARCHIVED;
    }
    
    /**
     * @dev Mark document as expired (automated or admin)
     * @param documentId The document ID to expire
     */
    function expireDocument(uint256 documentId) external documentExists(documentId) {
        require(
            block.timestamp >= documents[documentId].expiresAt ||
            accessControl.hasRoleOrHigher(msg.sender, accessControl.ADMIN_ROLE()),
            "Document not yet expired or insufficient permissions"
        );
        documents[documentId].lifecycle = DocumentLifecycle.EXPIRED;
    }
    
    /**
     * @dev Check if document is expired
     * @param documentId The document ID to check
     */
    function isDocumentExpired(uint256 documentId) external view documentExists(documentId) returns (bool) {
        return block.timestamp >= documents[documentId].expiresAt;
    }
    
    /**
     * @dev Get document lifecycle status
     * @param documentId The document ID
     */
    function getDocumentLifecycle(uint256 documentId) external view documentExists(documentId) returns (DocumentLifecycle) {
        return documents[documentId].lifecycle;
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
    
    /**
     * @dev Initialize auto-verification configurations for document types
     */
    function _initializeAutoVerificationConfigs() internal {
        // Legal documents - require manual approval
        autoVerificationConfigs["legal"] = AutoVerificationConfig({
            enabled: true,
            timeThreshold: 24 hours,
            consensusThreshold: 3,
            requiresManualApproval: true,
            maxAutoVerifications: 10
        });
        
        // Financial documents - moderate automation
        autoVerificationConfigs["financial"] = AutoVerificationConfig({
            enabled: true,
            timeThreshold: 12 hours,
            consensusThreshold: 2,
            requiresManualApproval: false,
            maxAutoVerifications: 20
        });
        
        // Identity documents - strict verification
        autoVerificationConfigs["identity"] = AutoVerificationConfig({
            enabled: true,
            timeThreshold: 48 hours,
            consensusThreshold: 3,
            requiresManualApproval: true,
            maxAutoVerifications: 5
        });
        
        // Default configuration
        autoVerificationConfigs["default"] = AutoVerificationConfig({
            enabled: true,
            timeThreshold: 6 hours,
            consensusThreshold: 2,
            requiresManualApproval: false,
            maxAutoVerifications: 15
        });
    }
    
    /**
     * @dev Check and trigger automated verification if conditions are met
     * @param documentId The document ID to check
     */
    function _checkAutomatedVerificationTriggers(uint256 documentId) internal {
        Document storage doc = documents[documentId];
        AutoVerificationConfig memory config = autoVerificationConfigs[doc.documentType];
        
        if (config.timeThreshold == 0) {
            config = autoVerificationConfigs["default"];
        }
        
        if (!config.enabled) return;
        
        // Check time-based trigger
        if (block.timestamp >= doc.timestamp + config.timeThreshold &&
            doc.lifecycle == DocumentLifecycle.PENDING) {
            _triggerTimeBasedVerification(documentId, config);
        }
        
        // Check consensus-based trigger
        uint256 verificationCount = documentProofs[documentId].length;
        if (verificationCount >= config.consensusThreshold &&
            doc.lifecycle == DocumentLifecycle.PROCESSING) {
            _triggerConsensusBasedVerification(documentId, config);
        }
    }
    
    /**
     * @dev Trigger time-based automated verification
     * @param documentId The document ID
     * @param config The auto-verification configuration
     */
    function _triggerTimeBasedVerification(uint256 documentId, AutoVerificationConfig memory config) internal {
        if (_canAutoVerify(documentId, config)) {
            documents[documentId].lifecycle = DocumentLifecycle.PROCESSING;
            verificationTriggers[documentId] = TriggerType.TIME_BASED;
            autoVerificationCount[documentId]++;
            lastAutoVerification[documentId] = block.timestamp;
            
            emit AutoVerificationTriggered(documentId, TriggerType.TIME_BASED, address(this), block.timestamp);
        }
    }
    
    /**
     * @dev Trigger consensus-based automated verification
     * @param documentId The document ID
     * @param config The auto-verification configuration
     */
    function _triggerConsensusBasedVerification(uint256 documentId, AutoVerificationConfig memory config) internal {
        if (_canAutoVerify(documentId, config)) {
            // Check if consensus is positive
            uint256 validProofs = 0;
            VerificationProof[] memory proofs = documentProofs[documentId];
            
            for (uint256 i = 0; i < proofs.length; i++) {
                if (proofs[i].isValid) {
                    validProofs++;
                }
            }
            
            if (validProofs >= config.consensusThreshold) {
                documents[documentId].lifecycle = DocumentLifecycle.VERIFIED;
                documents[documentId].isVerified = true;
                documents[documentId].lastVerified = block.timestamp;
                verificationTriggers[documentId] = TriggerType.CONSENSUS_BASED;
                
                emit AutoVerificationTriggered(documentId, TriggerType.CONSENSUS_BASED, address(this), block.timestamp);
                emit VerificationThresholdReached(documentId, validProofs, config.consensusThreshold);
            }
        }
    }
    
    /**
     * @dev Check if document can be auto-verified based on limits
     * @param documentId The document ID
     * @param config The auto-verification configuration
     */
    function _canAutoVerify(uint256 documentId, AutoVerificationConfig memory config) internal view returns (bool) {
        // Check daily limit
        if (lastAutoVerification[documentId] > 0 &&
            block.timestamp < lastAutoVerification[documentId] + 1 days &&
            autoVerificationCount[documentId] >= config.maxAutoVerifications) {
            return false;
        }
        
        // Check if manual approval is required
        if (config.requiresManualApproval) {
            return false;
        }
        
        return true;
    }
    
    /**
     * @dev Manually trigger automated verification (admin only)
     * @param documentId The document ID
     * @param triggerType The type of trigger to use
     */
    function triggerAutomatedVerification(
        uint256 documentId,
        TriggerType triggerType
    ) external documentExists(documentId) {
        require(
            accessControl.hasRoleOrHigher(msg.sender, accessControl.ADMIN_ROLE()),
            "Only admin can manually trigger automated verification"
        );
        
        Document storage doc = documents[documentId];
        AutoVerificationConfig memory config = autoVerificationConfigs[doc.documentType];
        
        if (config.timeThreshold == 0) {
            config = autoVerificationConfigs["default"];
        }
        
        if (triggerType == TriggerType.TIME_BASED) {
            _triggerTimeBasedVerification(documentId, config);
        } else if (triggerType == TriggerType.CONSENSUS_BASED) {
            _triggerConsensusBasedVerification(documentId, config);
        }
        
        verificationTriggers[documentId] = triggerType;
        emit AutoVerificationTriggered(documentId, triggerType, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Update auto-verification configuration for a document type (admin only)
     * @param documentType The document type
     * @param enabled Whether auto-verification is enabled
     * @param timeThreshold Time threshold in seconds
     * @param consensusThreshold Number of verifiers needed for consensus
     * @param requiresManualApproval Whether manual approval is required
     * @param maxAutoVerifications Maximum auto-verifications per day
     */
    function updateAutoVerificationConfig(
        string memory documentType,
        bool enabled,
        uint256 timeThreshold,
        uint256 consensusThreshold,
        bool requiresManualApproval,
        uint256 maxAutoVerifications
    ) external {
        require(
            accessControl.hasRoleOrHigher(msg.sender, accessControl.ADMIN_ROLE()),
            "Only admin can update auto-verification config"
        );
        
        autoVerificationConfigs[documentType] = AutoVerificationConfig({
            enabled: enabled,
            timeThreshold: timeThreshold,
            consensusThreshold: consensusThreshold,
            requiresManualApproval: requiresManualApproval,
            maxAutoVerifications: maxAutoVerifications
        });
        
        emit AutoVerificationConfigUpdated(documentType, enabled, timeThreshold, consensusThreshold);
    }
    
    /**
     * @dev Get auto-verification configuration for a document type
     * @param documentType The document type
     */
    function getAutoVerificationConfig(string memory documentType) 
        external 
        view 
        returns (AutoVerificationConfig memory) 
    {
        AutoVerificationConfig memory config = autoVerificationConfigs[documentType];
        if (config.timeThreshold == 0) {
            config = autoVerificationConfigs["default"];
        }
        return config;
    }
    
    /**
     * @dev Get verification trigger type for a document
     * @param documentId The document ID
     */
    function getVerificationTrigger(uint256 documentId) 
        external 
        view 
        documentExists(documentId) 
        returns (TriggerType) 
    {
        return verificationTriggers[documentId];
    }
    
    /**
     * @dev Batch process automated verifications (can be called by anyone)
     * @param documentIds Array of document IDs to process
     */
    function batchProcessAutomatedVerifications(uint256[] calldata documentIds) external {
        for (uint256 i = 0; i < documentIds.length; i++) {
            if (documents[documentIds[i]].id != 0) {
                _checkAutomatedVerificationTriggers(documentIds[i]);
            }
        }
    }
    
    /**
     * @dev Set the multi-signature contract address (admin only)
     * @param _multiSig The multi-signature contract address
     */
    function setMultiSigContract(address _multiSig) external {
        require(
            accessControl.hasRoleOrHigher(msg.sender, accessControl.ADMIN_ROLE()),
            "Only admin can set multi-sig contract"
        );
        multiSig = SealGuardMultiSig(_multiSig);
    }
    
    /**
     * @dev Initialize multi-signature requirements for document types
     */
    function _initializeMultiSigRequirements() internal {
        // Legal documents require multi-sig for high-value operations
        typeRequiresMultiSig["legal"] = true;
        
        // Financial documents require multi-sig for transfers and archiving
        typeRequiresMultiSig["financial"] = true;
        
        // Identity documents require multi-sig for verification
        typeRequiresMultiSig["identity"] = true;
        
        // Medical documents require multi-sig for sensitive operations
        typeRequiresMultiSig["medical"] = true;
        
        // Contracts require multi-sig for ownership transfers
        typeRequiresMultiSig["contract"] = true;
    }
    
    /**
     * @dev Check if document requires multi-signature approval
     * @param documentId The document ID
     */
    function requiresMultiSigApproval(uint256 documentId) external view documentExists(documentId) returns (bool) {
        // Check document-specific requirement first
        if (requiresMultiSig[documentId]) {
            return true;
        }
        
        // Check document type requirement
        Document memory doc = documents[documentId];
        return typeRequiresMultiSig[doc.documentType];
    }
    
    /**
     * @dev Set multi-signature requirement for a specific document (admin only)
     * @param documentId The document ID
     * @param required Whether multi-sig is required
     */
    function setDocumentMultiSigRequirement(
        uint256 documentId,
        bool required
    ) external documentExists(documentId) {
        require(
            accessControl.hasRoleOrHigher(msg.sender, accessControl.ADMIN_ROLE()),
            "Only admin can set multi-sig requirements"
        );
        
        requiresMultiSig[documentId] = required;
        Document memory doc = documents[documentId];
        
        emit MultiSigRequirementSet(documentId, required, doc.documentType);
    }
    
    /**
     * @dev Set multi-signature requirement for a document type (admin only)
     * @param documentType The document type
     * @param required Whether multi-sig is required
     */
    function setTypeMultiSigRequirement(
        string memory documentType,
        bool required
    ) external {
        require(
            accessControl.hasRoleOrHigher(msg.sender, accessControl.ADMIN_ROLE()),
            "Only admin can set multi-sig requirements"
        );
        
        typeRequiresMultiSig[documentType] = required;
        
        emit MultiSigRequirementSet(0, required, documentType);
    }
    
    /**
     * @dev Mark document as multi-sig verified (called by multi-sig contract)
     * @param documentId The document ID
     * @param proposalId The multi-sig proposal ID
     */
    function markMultiSigVerified(
        uint256 documentId,
        uint256 proposalId
    ) external documentExists(documentId) {
        require(msg.sender == address(multiSig), "Only multi-sig contract can call this");
        
        multiSigVerified[documentId] = true;
        
        emit MultiSigVerificationCompleted(documentId, address(multiSig), proposalId);
    }
    
    /**
     * @dev Check if document has been multi-sig verified
     * @param documentId The document ID
     */
    function isMultiSigVerified(uint256 documentId) external view documentExists(documentId) returns (bool) {
        return multiSigVerified[documentId];
    }
}