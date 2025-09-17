// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./SealGuardAccessControl.sol";
import "./SealGuardRegistry.sol";

/**
 * @title SealGuardMultiSig
 * @dev Multi-signature approval workflows for SealGuard document verification
 * Handles complex verification scenarios requiring multiple approvers
 */
contract SealGuardMultiSig is ReentrancyGuard {
    SealGuardAccessControl public accessControl;
    SealGuardRegistry public registry;
    
    // Multi-signature proposal states
    enum ProposalState {
        PENDING,
        APPROVED,
        REJECTED,
        EXECUTED,
        CANCELLED,
        EXPIRED
    }
    
    // Types of multi-sig operations
    enum OperationType {
        DOCUMENT_VERIFICATION,
        OWNERSHIP_TRANSFER,
        ACCESS_GRANT,
        DOCUMENT_ARCHIVE,
        CONFIG_UPDATE,
        EMERGENCY_ACTION
    }
    
    struct MultiSigProposal {
        uint256 id;
        OperationType operationType;
        uint256 documentId;
        address proposer;
        address[] requiredSigners;
        address[] approvers;
        mapping(address => bool) hasApproved;
        uint256 requiredApprovals;
        uint256 currentApprovals;
        uint256 createdAt;
        uint256 expiresAt;
        ProposalState state;
        bytes proposalData; // Encoded operation-specific data
        string reason;
    }
    
    struct MultiSigConfig {
        uint256 minSigners;
        uint256 maxSigners;
        uint256 approvalThreshold; // Percentage (e.g., 67 for 67%)
        uint256 proposalExpiry; // Time in seconds
        bool requiresUnanimous;
        mapping(OperationType => uint256) operationThresholds;
    }
    
    // State variables
    uint256 private _proposalIds;
    mapping(uint256 => MultiSigProposal) public proposals;
    mapping(uint256 => MultiSigConfig) public documentConfigs; // document ID -> config
    mapping(string => MultiSigConfig) public typeConfigs; // document type -> config
    MultiSigConfig public defaultConfig;
    
    // Mappings for efficient queries
    mapping(address => uint256[]) public userProposals;
    mapping(uint256 => uint256[]) public documentProposals;
    mapping(OperationType => uint256[]) public operationProposals;
    
    // Events
    event ProposalCreated(
        uint256 indexed proposalId,
        OperationType indexed operationType,
        uint256 indexed documentId,
        address proposer,
        uint256 requiredApprovals
    );
    
    event ProposalApproved(
        uint256 indexed proposalId,
        address indexed approver,
        uint256 currentApprovals,
        uint256 requiredApprovals
    );
    
    event ProposalExecuted(
        uint256 indexed proposalId,
        OperationType indexed operationType,
        address indexed executor
    );
    
    event ProposalRejected(
        uint256 indexed proposalId,
        address indexed rejector,
        string reason
    );
    
    event MultiSigConfigUpdated(
        uint256 indexed documentId,
        uint256 minSigners,
        uint256 approvalThreshold
    );
    
    // Modifiers
    modifier onlyAuthorized() {
        require(
            accessControl.hasRoleOrHigher(msg.sender, accessControl.VERIFIER_ROLE()),
            "Insufficient permissions"
        );
        _;
    }
    
    modifier proposalExists(uint256 proposalId) {
        require(proposals[proposalId].id != 0, "Proposal does not exist");
        _;
    }
    
    modifier proposalPending(uint256 proposalId) {
        require(proposals[proposalId].state == ProposalState.PENDING, "Proposal not pending");
        _;
    }
    
    constructor(
        address _accessControl,
        address _registry
    ) {
        accessControl = SealGuardAccessControl(_accessControl);
        registry = SealGuardRegistry(_registry);
        
        // Initialize default multi-sig configuration
        _initializeDefaultConfig();
    }
    
    /**
     * @dev Initialize default multi-signature configuration
     */
    function _initializeDefaultConfig() internal {
        defaultConfig.minSigners = 2;
        defaultConfig.maxSigners = 10;
        defaultConfig.approvalThreshold = 67; // 67%
        defaultConfig.proposalExpiry = 7 days;
        defaultConfig.requiresUnanimous = false;
        
        // Set operation-specific thresholds
        defaultConfig.operationThresholds[OperationType.DOCUMENT_VERIFICATION] = 51; // 51%
        defaultConfig.operationThresholds[OperationType.OWNERSHIP_TRANSFER] = 67; // 67%
        defaultConfig.operationThresholds[OperationType.ACCESS_GRANT] = 51; // 51%
        defaultConfig.operationThresholds[OperationType.DOCUMENT_ARCHIVE] = 75; // 75%
        defaultConfig.operationThresholds[OperationType.CONFIG_UPDATE] = 80; // 80%
        defaultConfig.operationThresholds[OperationType.EMERGENCY_ACTION] = 90; // 90%
    }
    
    /**
     * @dev Create a new multi-signature proposal
     * @param operationType The type of operation
     * @param documentId The document ID (if applicable)
     * @param requiredSigners Array of addresses that must sign
     * @param proposalData Encoded operation-specific data
     * @param reason Human-readable reason for the proposal
     */
    function createProposal(
        OperationType operationType,
        uint256 documentId,
        address[] memory requiredSigners,
        bytes memory proposalData,
        string memory reason
    ) external onlyAuthorized nonReentrant returns (uint256) {
        require(requiredSigners.length >= 2, "Minimum 2 signers required");
        require(requiredSigners.length <= 10, "Maximum 10 signers allowed");
        
        _proposalIds++;
        uint256 proposalId = _proposalIds;
        
        // Get configuration for this operation
        MultiSigConfig memory config = _getConfigForDocument(documentId, operationType);
        uint256 requiredApprovals = _calculateRequiredApprovals(requiredSigners.length, config, operationType);
        
        // Create the proposal
        MultiSigProposal storage proposal = proposals[proposalId];
        proposal.id = proposalId;
        proposal.operationType = operationType;
        proposal.documentId = documentId;
        proposal.proposer = msg.sender;
        proposal.requiredSigners = requiredSigners;
        proposal.requiredApprovals = requiredApprovals;
        proposal.currentApprovals = 0;
        proposal.createdAt = block.timestamp;
        proposal.expiresAt = block.timestamp + config.proposalExpiry;
        proposal.state = ProposalState.PENDING;
        proposal.proposalData = proposalData;
        proposal.reason = reason;
        
        // Add to tracking mappings
        userProposals[msg.sender].push(proposalId);
        if (documentId > 0) {
            documentProposals[documentId].push(proposalId);
        }
        operationProposals[operationType].push(proposalId);
        
        emit ProposalCreated(proposalId, operationType, documentId, msg.sender, requiredApprovals);
        
        return proposalId;
    }
    
    /**
     * @dev Approve a multi-signature proposal
     * @param proposalId The proposal ID to approve
     */
    function approveProposal(uint256 proposalId) 
        external 
        proposalExists(proposalId) 
        proposalPending(proposalId) 
        nonReentrant 
    {
        MultiSigProposal storage proposal = proposals[proposalId];
        
        // Check if proposal has expired
        require(block.timestamp <= proposal.expiresAt, "Proposal has expired");
        
        // Check if sender is a required signer
        bool isRequiredSigner = false;
        for (uint256 i = 0; i < proposal.requiredSigners.length; i++) {
            if (proposal.requiredSigners[i] == msg.sender) {
                isRequiredSigner = true;
                break;
            }
        }
        require(isRequiredSigner, "Not a required signer for this proposal");
        
        // Check if already approved
        require(!proposal.hasApproved[msg.sender], "Already approved this proposal");
        
        // Record approval
        proposal.hasApproved[msg.sender] = true;
        proposal.approvers.push(msg.sender);
        proposal.currentApprovals++;
        
        emit ProposalApproved(proposalId, msg.sender, proposal.currentApprovals, proposal.requiredApprovals);
        
        // Check if proposal can be executed
        if (proposal.currentApprovals >= proposal.requiredApprovals) {
            proposal.state = ProposalState.APPROVED;
            _executeProposal(proposalId);
        }
    }
    
    /**
     * @dev Reject a multi-signature proposal
     * @param proposalId The proposal ID to reject
     * @param rejectionReason Reason for rejection
     */
    function rejectProposal(
        uint256 proposalId,
        string memory rejectionReason
    ) external proposalExists(proposalId) proposalPending(proposalId) {
        MultiSigProposal storage proposal = proposals[proposalId];
        
        // Check if sender is a required signer or has admin role
        bool canReject = false;
        for (uint256 i = 0; i < proposal.requiredSigners.length; i++) {
            if (proposal.requiredSigners[i] == msg.sender) {
                canReject = true;
                break;
            }
        }
        
        if (!canReject) {
            require(
                accessControl.hasRoleOrHigher(msg.sender, accessControl.ADMIN_ROLE()),
                "Not authorized to reject this proposal"
            );
        }
        
        proposal.state = ProposalState.REJECTED;
        
        emit ProposalRejected(proposalId, msg.sender, rejectionReason);
    }
    
    /**
     * @dev Execute an approved proposal
     * @param proposalId The proposal ID to execute
     */
    function _executeProposal(uint256 proposalId) internal {
        MultiSigProposal storage proposal = proposals[proposalId];
        
        if (proposal.operationType == OperationType.DOCUMENT_VERIFICATION) {
            _executeDocumentVerification(proposal);
        } else if (proposal.operationType == OperationType.OWNERSHIP_TRANSFER) {
            _executeOwnershipTransfer(proposal);
        } else if (proposal.operationType == OperationType.ACCESS_GRANT) {
            _executeAccessGrant(proposal);
        } else if (proposal.operationType == OperationType.DOCUMENT_ARCHIVE) {
            _executeDocumentArchive(proposal);
        }
        
        proposal.state = ProposalState.EXECUTED;
        
        emit ProposalExecuted(proposalId, proposal.operationType, msg.sender);
    }
    
    /**
     * @dev Execute document verification through multi-sig
     * @param proposal The proposal to execute
     */
    function _executeDocumentVerification(MultiSigProposal storage proposal) internal {
        // Decode verification data
        (bytes32 proofHash, string memory proofData, bool isValid) = abi.decode(
            proposal.proposalData,
            (bytes32, string, bool)
        );
        
        // Submit verification proof to registry
        registry.submitVerificationProof(
            proposal.documentId,
            proofHash,
            proofData,
            isValid
        );
        
        // Mark as multi-sig verified
        registry.markMultiSigVerified(proposal.documentId, proposal.id);
    }
    
    /**
     * @dev Execute ownership transfer through multi-sig
     * @param proposal The proposal to execute
     */
    function _executeOwnershipTransfer(MultiSigProposal storage proposal) internal {
        // Decode transfer data
        address newOwner = abi.decode(proposal.proposalData, (address));
        
        // Transfer document ownership
        registry.transferDocumentOwnership(proposal.documentId, newOwner);
        
        // Mark as multi-sig verified
        registry.markMultiSigVerified(proposal.documentId, proposal.id);
    }
    
    /**
     * @dev Execute access grant through multi-sig
     * @param proposal The proposal to execute
     */
    function _executeAccessGrant(MultiSigProposal storage proposal) internal {
        // Implementation would depend on access control system
        // This is a placeholder for the actual access granting logic
    }
    
    /**
     * @dev Execute document archive through multi-sig
     * @param proposal The proposal to execute
     */
    function _executeDocumentArchive(MultiSigProposal storage proposal) internal {
        // Archive the document
        registry.archiveDocument(proposal.documentId);
        
        // Mark as multi-sig verified
        registry.markMultiSigVerified(proposal.documentId, proposal.id);
    }
    
    /**
     * @dev Get configuration for a specific document and operation
     * @param documentId The document ID
     * @param operationType The operation type
     */
    function _getConfigForDocument(
        uint256 documentId,
        OperationType operationType
    ) internal view returns (MultiSigConfig memory) {
        // Try document-specific config first
        if (documentConfigs[documentId].minSigners > 0) {
            return documentConfigs[documentId];
        }
        
        // Try document type config
        if (documentId > 0) {
            SealGuardRegistry.Document memory doc = registry.getDocument(documentId);
            if (typeConfigs[doc.documentType].minSigners > 0) {
                return typeConfigs[doc.documentType];
            }
        }
        
        // Fall back to default config
        return defaultConfig;
    }
    
    /**
     * @dev Calculate required approvals based on configuration
     * @param signerCount Number of signers
     * @param config Multi-sig configuration
     * @param operationType Type of operation
     */
    function _calculateRequiredApprovals(
        uint256 signerCount,
        MultiSigConfig memory config,
        OperationType operationType
    ) internal pure returns (uint256) {
        if (config.requiresUnanimous) {
            return signerCount;
        }
        
        uint256 threshold = config.operationThresholds[operationType];
        if (threshold == 0) {
            threshold = config.approvalThreshold;
        }
        
        return (signerCount * threshold + 99) / 100; // Ceiling division
    }
    
    /**
     * @dev Get proposal details
     * @param proposalId The proposal ID
     */
    function getProposal(uint256 proposalId) 
        external 
        view 
        proposalExists(proposalId) 
        returns (
            uint256 id,
            OperationType operationType,
            uint256 documentId,
            address proposer,
            address[] memory requiredSigners,
            address[] memory approvers,
            uint256 requiredApprovals,
            uint256 currentApprovals,
            uint256 createdAt,
            uint256 expiresAt,
            ProposalState state,
            string memory reason
        ) 
    {
        MultiSigProposal storage proposal = proposals[proposalId];
        return (
            proposal.id,
            proposal.operationType,
            proposal.documentId,
            proposal.proposer,
            proposal.requiredSigners,
            proposal.approvers,
            proposal.requiredApprovals,
            proposal.currentApprovals,
            proposal.createdAt,
            proposal.expiresAt,
            proposal.state,
            proposal.reason
        );
    }
    
    /**
     * @dev Check if an address has approved a proposal
     * @param proposalId The proposal ID
     * @param signer The signer address
     */
    function hasApproved(uint256 proposalId, address signer) 
        external 
        view 
        proposalExists(proposalId) 
        returns (bool) 
    {
        return proposals[proposalId].hasApproved[signer];
    }
    
    /**
     * @dev Get proposals by user
     * @param user The user address
     */
    function getUserProposals(address user) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return userProposals[user];
    }
    
    /**
     * @dev Get proposals by document
     * @param documentId The document ID
     */
    function getDocumentProposals(uint256 documentId) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return documentProposals[documentId];
    }
    
    /**
     * @dev Update multi-sig configuration for a document type (admin only)
     * @param documentType The document type
     * @param minSigners Minimum number of signers
     * @param maxSigners Maximum number of signers
     * @param approvalThreshold Approval threshold percentage
     * @param proposalExpiry Proposal expiry time in seconds
     * @param requiresUnanimous Whether unanimous approval is required
     */
    function updateTypeConfig(
        string memory documentType,
        uint256 minSigners,
        uint256 maxSigners,
        uint256 approvalThreshold,
        uint256 proposalExpiry,
        bool requiresUnanimous
    ) external {
        require(
            accessControl.hasRoleOrHigher(msg.sender, accessControl.ADMIN_ROLE()),
            "Only admin can update multi-sig config"
        );
        
        MultiSigConfig storage config = typeConfigs[documentType];
        config.minSigners = minSigners;
        config.maxSigners = maxSigners;
        config.approvalThreshold = approvalThreshold;
        config.proposalExpiry = proposalExpiry;
        config.requiresUnanimous = requiresUnanimous;
    }
    
    /**
     * @dev Get total number of proposals
     */
    function getTotalProposals() external view returns (uint256) {
        return _proposalIds;
    }
    
    /**
     * @dev Cancel a proposal (proposer or admin only)
     * @param proposalId The proposal ID to cancel
     */
    function cancelProposal(uint256 proposalId) 
        external 
        proposalExists(proposalId) 
        proposalPending(proposalId) 
    {
        MultiSigProposal storage proposal = proposals[proposalId];
        
        require(
            proposal.proposer == msg.sender ||
            accessControl.hasRoleOrHigher(msg.sender, accessControl.ADMIN_ROLE()),
            "Only proposer or admin can cancel"
        );
        
        proposal.state = ProposalState.CANCELLED;
    }
    
    /**
     * @dev Expire old proposals (can be called by anyone)
     * @param proposalIds Array of proposal IDs to check for expiration
     */
    function expireProposals(uint256[] calldata proposalIds) external {
        for (uint256 i = 0; i < proposalIds.length; i++) {
            if (proposals[proposalIds[i]].id != 0 &&
                proposals[proposalIds[i]].state == ProposalState.PENDING &&
                block.timestamp > proposals[proposalIds[i]].expiresAt) {
                proposals[proposalIds[i]].state = ProposalState.EXPIRED;
            }
        }
    }
}