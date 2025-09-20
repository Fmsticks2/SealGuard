// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SealGuardAccessControl
 * @dev Access control contract for SealGuard system
 * Manages roles, permissions, and document access rights
 */
contract SealGuardAccessControl is AccessControl, ReentrancyGuard {
    
    // Role definitions - aligned with backend hierarchy
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MODERATOR_ROLE = keccak256("MODERATOR_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant DOCUMENT_MANAGER_ROLE = keccak256("DOCUMENT_MANAGER_ROLE");
    bytes32 public constant USER_ROLE = keccak256("USER_ROLE");
    
    // Role hierarchy levels
    mapping(bytes32 => uint8) public roleHierarchy;
    
    // User role assignments
    mapping(address => bytes32) public userRoles;
    
    struct AccessPermission {
        uint256 documentId;
        address grantee;
        address grantor;
        uint256 expiresAt;
        bool canRead;
        bool canVerify;
        bool canTransfer;
        uint256 grantedAt;
        bool isActive;
    }
    
    struct OrganizationMember {
        address member;
        string role;
        uint256 joinedAt;
        bool isActive;
    }
    
    // Mappings
    mapping(uint256 => mapping(address => AccessPermission)) public documentAccess;
    mapping(uint256 => address[]) public documentAccessList;
    mapping(string => address[]) public organizationMembers;
    mapping(address => string[]) public userOrganizations;
    mapping(string => mapping(address => OrganizationMember)) public orgMemberDetails;
    
    // Events
    event AccessGranted(
        uint256 indexed documentId,
        address indexed grantee,
        address indexed grantor,
        uint256 expiresAt
    );
    
    event AccessRevoked(
        uint256 indexed documentId,
        address indexed grantee,
        address indexed revoker
    );
    
    event OrganizationJoined(
        string indexed organizationId,
        address indexed member,
        string role
    );
    
    event OrganizationLeft(
        string indexed organizationId,
        address indexed member
    );
    

    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        
        // Set up role hierarchy
        roleHierarchy[ADMIN_ROLE] = 6;
        roleHierarchy[MODERATOR_ROLE] = 5;
        roleHierarchy[AUDITOR_ROLE] = 4;
        roleHierarchy[VERIFIER_ROLE] = 3;
        roleHierarchy[DOCUMENT_MANAGER_ROLE] = 2;
        roleHierarchy[USER_ROLE] = 1;
        
        // Set up role admin relationships
        _setRoleAdmin(MODERATOR_ROLE, ADMIN_ROLE);
        _setRoleAdmin(AUDITOR_ROLE, ADMIN_ROLE);
        _setRoleAdmin(VERIFIER_ROLE, MODERATOR_ROLE);
        _setRoleAdmin(DOCUMENT_MANAGER_ROLE, AUDITOR_ROLE);
        _setRoleAdmin(USER_ROLE, DOCUMENT_MANAGER_ROLE);
    }
    
    /**
     * @dev Check if an account has a role or a higher role in the hierarchy
     * @param account The account to check
     * @param role The minimum role required
     */
    function hasRoleOrHigher(address account, bytes32 role) public view returns (bool) {
        // Check if user has the exact role
        if (hasRole(role, account)) {
            return true;
        }
        
        // Check if user has a higher role in the hierarchy
        uint8 requiredLevel = roleHierarchy[role];
        
        // Check all roles with higher hierarchy levels
        if (requiredLevel < roleHierarchy[ADMIN_ROLE] && hasRole(ADMIN_ROLE, account)) {
            return true;
        }
        if (requiredLevel < roleHierarchy[MODERATOR_ROLE] && hasRole(MODERATOR_ROLE, account)) {
            return true;
        }
        if (requiredLevel < roleHierarchy[AUDITOR_ROLE] && hasRole(AUDITOR_ROLE, account)) {
            return true;
        }
        if (requiredLevel < roleHierarchy[VERIFIER_ROLE] && hasRole(VERIFIER_ROLE, account)) {
            return true;
        }
        if (requiredLevel < roleHierarchy[DOCUMENT_MANAGER_ROLE] && hasRole(DOCUMENT_MANAGER_ROLE, account)) {
            return true;
        }
        
        return false;
    }
    
    /**
     * @dev Grant access to a document
     * @param documentId The ID of the document
     * @param grantee The address to grant access to
     * @param expiresAt Timestamp when access expires (0 for no expiry)
     * @param canRead Whether the grantee can read the document
     * @param canVerify Whether the grantee can verify the document
     * @param canTransfer Whether the grantee can transfer the document
     */
    function grantDocumentAccess(
        uint256 documentId,
        address grantee,
        uint256 expiresAt,
        bool canRead,
        bool canVerify,
        bool canTransfer
    ) external nonReentrant {
        require(grantee != address(0), "Invalid grantee address");
        require(grantee != msg.sender, "Cannot grant access to self");
        require(
            hasRole(DOCUMENT_MANAGER_ROLE, msg.sender) || 
            _isDocumentOwner(documentId, msg.sender),
            "Not authorized to grant access"
        );
        
        if (expiresAt > 0) {
            require(expiresAt > block.timestamp, "Expiry time must be in future");
        }
        
        AccessPermission storage permission = documentAccess[documentId][grantee];
        
        // If permission doesn't exist, add to access list
        if (!permission.isActive) {
            documentAccessList[documentId].push(grantee);
        }
        
        permission.documentId = documentId;
        permission.grantee = grantee;
        permission.grantor = msg.sender;
        permission.expiresAt = expiresAt;
        permission.canRead = canRead;
        permission.canVerify = canVerify;
        permission.canTransfer = canTransfer;
        permission.grantedAt = block.timestamp;
        permission.isActive = true;
        
        emit AccessGranted(documentId, grantee, msg.sender, expiresAt);
    }
    
    /**
     * @dev Revoke access to a document
     * @param documentId The ID of the document
     * @param grantee The address to revoke access from
     */
    function revokeDocumentAccess(
        uint256 documentId,
        address grantee
    ) external nonReentrant {
        require(
            hasRole(DOCUMENT_MANAGER_ROLE, msg.sender) || 
            _isDocumentOwner(documentId, msg.sender) ||
            documentAccess[documentId][grantee].grantor == msg.sender,
            "Not authorized to revoke access"
        );
        
        AccessPermission storage permission = documentAccess[documentId][grantee];
        require(permission.isActive, "Access not granted");
        
        permission.isActive = false;
        
        // Remove from access list
        _removeFromAccessList(documentId, grantee);
        
        emit AccessRevoked(documentId, grantee, msg.sender);
    }
    
    /**
     * @dev Check if an address has read access to a document
     * @param documentId The ID of the document
     * @param user The address to check
     */
    function hasReadAccess(uint256 documentId, address user) external view returns (bool) {
        if (_isDocumentOwner(documentId, user)) {
            return true;
        }
        
        AccessPermission memory permission = documentAccess[documentId][user];
        
        if (!permission.isActive || !permission.canRead) {
            return false;
        }
        
        // Check if access has expired
        if (permission.expiresAt > 0 && block.timestamp > permission.expiresAt) {
            return false;
        }
        
        return true;
    }
    
    /**
     * @dev Check if an address has verify access to a document
     * @param documentId The ID of the document
     * @param user The address to check
     */
    function hasVerifyAccess(uint256 documentId, address user) external view returns (bool) {
        if (_isDocumentOwner(documentId, user) || hasRole(VERIFIER_ROLE, user)) {
            return true;
        }
        
        AccessPermission memory permission = documentAccess[documentId][user];
        
        if (!permission.isActive || !permission.canVerify) {
            return false;
        }
        
        // Check if access has expired
        if (permission.expiresAt > 0 && block.timestamp > permission.expiresAt) {
            return false;
        }
        
        return true;
    }
    
    /**
     * @dev Check if an address has transfer access to a document
     * @param documentId The ID of the document
     * @param user The address to check
     */
    function hasTransferAccess(uint256 documentId, address user) external view returns (bool) {
        if (_isDocumentOwner(documentId, user)) {
            return true;
        }
        
        AccessPermission memory permission = documentAccess[documentId][user];
        
        if (!permission.isActive || !permission.canTransfer) {
            return false;
        }
        
        // Check if access has expired
        if (permission.expiresAt > 0 && block.timestamp > permission.expiresAt) {
            return false;
        }
        
        return true;
    }
    
    /**
     * @dev Join an organization
     * @param organizationId The ID of the organization
     * @param role The role within the organization
     */
    function joinOrganization(
        string memory organizationId,
        string memory role
    ) external nonReentrant {
        require(bytes(organizationId).length > 0, "Invalid organization ID");
        require(bytes(role).length > 0, "Invalid role");
        require(
            !orgMemberDetails[organizationId][msg.sender].isActive,
            "Already a member"
        );
        
        organizationMembers[organizationId].push(msg.sender);
        userOrganizations[msg.sender].push(organizationId);
        
        orgMemberDetails[organizationId][msg.sender] = OrganizationMember({
            member: msg.sender,
            role: role,
            joinedAt: block.timestamp,
            isActive: true
        });
        
        emit OrganizationJoined(organizationId, msg.sender, role);
    }
    
    /**
     * @dev Leave an organization
     * @param organizationId The ID of the organization
     */
    function leaveOrganization(string memory organizationId) external nonReentrant {
        require(
            orgMemberDetails[organizationId][msg.sender].isActive,
            "Not a member"
        );
        
        orgMemberDetails[organizationId][msg.sender].isActive = false;
        
        // Remove from organization members list
        _removeFromOrganization(organizationId, msg.sender);
        
        // Remove from user organizations list
        _removeFromUserOrganizations(msg.sender, organizationId);
        
        emit OrganizationLeft(organizationId, msg.sender);
    }
    
    /**
     * @dev Get all members of an organization
     * @param organizationId The ID of the organization
     */
    function getOrganizationMembers(string memory organizationId) 
        external 
        view 
        returns (address[] memory) 
    {
        return organizationMembers[organizationId];
    }
    
    /**
     * @dev Get all organizations a user belongs to
     * @param user The address of the user
     */
    function getUserOrganizations(address user) 
        external 
        view 
        returns (string[] memory) 
    {
        return userOrganizations[user];
    }
    
    /**
     * @dev Get access list for a document
     * @param documentId The ID of the document
     */
    function getDocumentAccessList(uint256 documentId) 
        external 
        view 
        returns (address[] memory) 
    {
        return documentAccessList[documentId];
    }
    
    /**
     * @dev Get access permission details
     * @param documentId The ID of the document
     * @param user The address of the user
     */
    function getAccessPermission(uint256 documentId, address user) 
        external 
        view 
        returns (AccessPermission memory) 
    {
        return documentAccess[documentId][user];
    }
    
    /**
     * @dev Internal function to check if user is document owner
     * This should be implemented to check with the main registry contract
     */
    function _isDocumentOwner(uint256 documentId, address user) internal pure returns (bool) {
        // This is a placeholder - in practice, this would call the main registry contract
        // to check document ownership
        documentId; // Silence unused parameter warning
        user; // Silence unused parameter warning
        return false;
    }
    
    /**
     * @dev Internal function to remove address from document access list
     */
    function _removeFromAccessList(uint256 documentId, address user) internal {
        address[] storage accessList = documentAccessList[documentId];
        for (uint256 i = 0; i < accessList.length; i++) {
            if (accessList[i] == user) {
                accessList[i] = accessList[accessList.length - 1];
                accessList.pop();
                break;
            }
        }
    }
    
    /**
     * @dev Internal function to remove user from organization
     */
    function _removeFromOrganization(string memory organizationId, address user) internal {
        address[] storage members = organizationMembers[organizationId];
        for (uint256 i = 0; i < members.length; i++) {
            if (members[i] == user) {
                members[i] = members[members.length - 1];
                members.pop();
                break;
            }
        }
    }
    
    /**
     * @dev Internal function to remove organization from user's list
     */
    function _removeFromUserOrganizations(address user, string memory organizationId) internal {
        string[] storage orgs = userOrganizations[user];
        for (uint256 i = 0; i < orgs.length; i++) {
            if (keccak256(bytes(orgs[i])) == keccak256(bytes(organizationId))) {
                orgs[i] = orgs[orgs.length - 1];
                orgs.pop();
                break;
            }
        }
    }
}