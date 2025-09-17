const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("SealGuardMultiSig", function () {
    let accessControl, registry, multiSig;
    let owner, verifier1, verifier2, verifier3, user1, user2;
    let documentId;
    
    beforeEach(async function () {
        [owner, verifier1, verifier2, verifier3, user1, user2] = await ethers.getSigners();
        
        // Deploy contracts
        const AccessControl = await ethers.getContractFactory("SealGuardAccessControl");
        accessControl = await AccessControl.deploy();
        await accessControl.deployed();
        
        const Registry = await ethers.getContractFactory("SealGuardRegistry");
        registry = await Registry.deploy(owner.address, accessControl.address);
        await registry.deployed();
        
        const MultiSig = await ethers.getContractFactory("SealGuardMultiSig");
        multiSig = await MultiSig.deploy(accessControl.address, registry.address);
        await multiSig.deployed();
        
        // Link contracts
        await registry.setMultiSigContract(multiSig.address);
        
        // Grant roles
        const verifierRole = await accessControl.VERIFIER_ROLE();
        const auditorRole = await accessControl.AUDITOR_ROLE();
        
        await accessControl.grantRole(verifierRole, verifier1.address);
        await accessControl.grantRole(verifierRole, verifier2.address);
        await accessControl.grantRole(verifierRole, verifier3.address);
        await accessControl.grantRole(auditorRole, verifier1.address);
        await accessControl.grantRole(auditorRole, verifier2.address);
        
        // Register a test document
        const tx = await registry.connect(user1).registerDocument(
            "legal",
            "Test Legal Document",
            "QmTestHash123",
            "Test legal document for multi-sig testing"
        );
        const receipt = await tx.wait();
        documentId = receipt.events[0].args.documentId;
    });
    
    describe("Deployment and Configuration", function () {
        it("Should deploy with correct initial configuration", async function () {
            const defaultConfig = await multiSig.defaultConfig();
            expect(defaultConfig.minSigners).to.equal(2);
            expect(defaultConfig.maxSigners).to.equal(10);
            expect(defaultConfig.approvalThreshold).to.equal(60);
            expect(defaultConfig.proposalExpiry).to.equal(7 * 24 * 60 * 60); // 7 days
        });
        
        it("Should have correct registry and access control addresses", async function () {
            expect(await multiSig.registry()).to.equal(registry.address);
            expect(await multiSig.accessControl()).to.equal(accessControl.address);
        });
        
        it("Should allow admin to update default configuration", async function () {
            await multiSig.updateDefaultConfig(3, 15, 75, 10 * 24 * 60 * 60);
            
            const newConfig = await multiSig.defaultConfig();
            expect(newConfig.minSigners).to.equal(3);
            expect(newConfig.maxSigners).to.equal(15);
            expect(newConfig.approvalThreshold).to.equal(75);
            expect(newConfig.proposalExpiry).to.equal(10 * 24 * 60 * 60);
        });
    });
    
    describe("Multi-Signature Proposal Creation", function () {
        it("Should create verification proposal", async function () {
            const proofHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test proof"));
            const proofData = "Test verification proof data";
            
            await expect(
                multiSig.connect(verifier1).createVerificationProposal(
                    documentId,
                    proofHash,
                    proofData,
                    true
                )
            ).to.emit(multiSig, "ProposalCreated");
            
            const proposal = await multiSig.getProposal(1);
            expect(proposal.documentId).to.equal(documentId);
            expect(proposal.proposer).to.equal(verifier1.address);
            expect(proposal.operationType).to.equal(0); // VERIFICATION
            expect(proposal.status).to.equal(0); // PENDING
        });
        
        it("Should create ownership transfer proposal", async function () {
            await expect(
                multiSig.connect(verifier1).createOwnershipTransferProposal(
                    documentId,
                    user2.address
                )
            ).to.emit(multiSig, "ProposalCreated");
            
            const proposal = await multiSig.getProposal(1);
            expect(proposal.operationType).to.equal(1); // OWNERSHIP_TRANSFER
        });
        
        it("Should create archive proposal", async function () {
            await expect(
                multiSig.connect(verifier1).createArchiveProposal(documentId)
            ).to.emit(multiSig, "ProposalCreated");
            
            const proposal = await multiSig.getProposal(1);
            expect(proposal.operationType).to.equal(2); // ARCHIVE
        });
        
        it("Should reject proposal creation by non-verifier", async function () {
            const proofHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test proof"));
            
            await expect(
                multiSig.connect(user1).createVerificationProposal(
                    documentId,
                    proofHash,
                    "Test proof",
                    true
                )
            ).to.be.revertedWith("Caller is not a verifier");
        });
    });
    
    describe("Multi-Signature Approval Process", function () {
        let proposalId;
        
        beforeEach(async function () {
            const proofHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test proof"));
            const tx = await multiSig.connect(verifier1).createVerificationProposal(
                documentId,
                proofHash,
                "Test verification proof data",
                true
            );
            const receipt = await tx.wait();
            proposalId = receipt.events[0].args.proposalId;
        });
        
        it("Should allow verifiers to approve proposals", async function () {
            await expect(
                multiSig.connect(verifier2).approveProposal(proposalId)
            ).to.emit(multiSig, "ProposalApproved");
            
            const proposal = await multiSig.getProposal(proposalId);
            expect(proposal.approvals).to.equal(1);
            expect(await multiSig.hasApproved(proposalId, verifier2.address)).to.be.true;
        });
        
        it("Should allow verifiers to reject proposals", async function () {
            await expect(
                multiSig.connect(verifier2).rejectProposal(proposalId)
            ).to.emit(multiSig, "ProposalRejected");
            
            const proposal = await multiSig.getProposal(proposalId);
            expect(proposal.status).to.equal(2); // REJECTED
        });
        
        it("Should prevent double approval", async function () {
            await multiSig.connect(verifier2).approveProposal(proposalId);
            
            await expect(
                multiSig.connect(verifier2).approveProposal(proposalId)
            ).to.be.revertedWith("Already voted on this proposal");
        });
        
        it("Should prevent non-verifiers from approving", async function () {
            await expect(
                multiSig.connect(user1).approveProposal(proposalId)
            ).to.be.revertedWith("Caller is not a verifier");
        });
    });
    
    describe("Multi-Signature Execution", function () {
        let proposalId;
        
        beforeEach(async function () {
            const proofHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test proof"));
            const tx = await multiSig.connect(verifier1).createVerificationProposal(
                documentId,
                proofHash,
                "Test verification proof data",
                true
            );
            const receipt = await tx.wait();
            proposalId = receipt.events[0].args.proposalId;
        });
        
        it("Should execute proposal when threshold is met", async function () {
            // Get enough approvals (60% threshold with 2 min signers)
            await multiSig.connect(verifier2).approveProposal(proposalId);
            await multiSig.connect(verifier3).approveProposal(proposalId);
            
            await expect(
                multiSig.connect(verifier1).executeProposal(proposalId)
            ).to.emit(multiSig, "ProposalExecuted");
            
            const proposal = await multiSig.getProposal(proposalId);
            expect(proposal.status).to.equal(1); // EXECUTED
            
            // Check that document was verified
            const document = await registry.getDocument(documentId);
            expect(document.lifecycle).to.equal(2); // VERIFIED
        });
        
        it("Should reject execution without enough approvals", async function () {
            // Only one approval (not enough for 60% threshold)
            await multiSig.connect(verifier2).approveProposal(proposalId);
            
            await expect(
                multiSig.connect(verifier1).executeProposal(proposalId)
            ).to.be.revertedWith("Insufficient approvals");
        });
        
        it("Should reject execution of expired proposals", async function () {
            // Get enough approvals
            await multiSig.connect(verifier2).approveProposal(proposalId);
            await multiSig.connect(verifier3).approveProposal(proposalId);
            
            // Fast forward past expiry
            await time.increase(8 * 24 * 60 * 60); // 8 days
            
            await expect(
                multiSig.connect(verifier1).executeProposal(proposalId)
            ).to.be.revertedWith("Proposal has expired");
        });
        
        it("Should reject execution of already executed proposals", async function () {
            // Get enough approvals and execute
            await multiSig.connect(verifier2).approveProposal(proposalId);
            await multiSig.connect(verifier3).approveProposal(proposalId);
            await multiSig.connect(verifier1).executeProposal(proposalId);
            
            // Try to execute again
            await expect(
                multiSig.connect(verifier1).executeProposal(proposalId)
            ).to.be.revertedWith("Proposal not pending");
        });
    });
    
    describe("Integration with Registry", function () {
        it("Should mark document as multi-sig verified after execution", async function () {
            const proofHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test proof"));
            const tx = await multiSig.connect(verifier1).createVerificationProposal(
                documentId,
                proofHash,
                "Test verification proof data",
                true
            );
            const receipt = await tx.wait();
            const proposalId = receipt.events[0].args.proposalId;
            
            // Approve and execute
            await multiSig.connect(verifier2).approveProposal(proposalId);
            await multiSig.connect(verifier3).approveProposal(proposalId);
            await multiSig.connect(verifier1).executeProposal(proposalId);
            
            // Check multi-sig verification status
            expect(await registry.isMultiSigVerified(documentId)).to.be.true;
        });
        
        it("Should handle ownership transfer through multi-sig", async function () {
            const tx = await multiSig.connect(verifier1).createOwnershipTransferProposal(
                documentId,
                user2.address
            );
            const receipt = await tx.wait();
            const proposalId = receipt.events[0].args.proposalId;
            
            // Approve and execute
            await multiSig.connect(verifier2).approveProposal(proposalId);
            await multiSig.connect(verifier3).approveProposal(proposalId);
            await multiSig.connect(verifier1).executeProposal(proposalId);
            
            // Check ownership transfer
            const document = await registry.getDocument(documentId);
            expect(document.owner).to.equal(user2.address);
            expect(await registry.isMultiSigVerified(documentId)).to.be.true;
        });
    });
    
    describe("Query Functions", function () {
        let proposalId;
        
        beforeEach(async function () {
            const proofHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test proof"));
            const tx = await multiSig.connect(verifier1).createVerificationProposal(
                documentId,
                proofHash,
                "Test verification proof data",
                true
            );
            const receipt = await tx.wait();
            proposalId = receipt.events[0].args.proposalId;
        });
        
        it("Should return correct proposal details", async function () {
            const proposal = await multiSig.getProposal(proposalId);
            expect(proposal.documentId).to.equal(documentId);
            expect(proposal.proposer).to.equal(verifier1.address);
            expect(proposal.operationType).to.equal(0); // VERIFICATION
            expect(proposal.status).to.equal(0); // PENDING
        });
        
        it("Should return proposals for document", async function () {
            const proposals = await multiSig.getProposalsForDocument(documentId);
            expect(proposals.length).to.equal(1);
            expect(proposals[0]).to.equal(proposalId);
        });
        
        it("Should return user proposals", async function () {
            const proposals = await multiSig.getUserProposals(verifier1.address);
            expect(proposals.length).to.equal(1);
            expect(proposals[0]).to.equal(proposalId);
        });
        
        it("Should check approval status correctly", async function () {
            expect(await multiSig.hasApproved(proposalId, verifier1.address)).to.be.false;
            expect(await multiSig.hasApproved(proposalId, verifier2.address)).to.be.false;
            
            await multiSig.connect(verifier2).approveProposal(proposalId);
            expect(await multiSig.hasApproved(proposalId, verifier2.address)).to.be.true;
        });
    });
});