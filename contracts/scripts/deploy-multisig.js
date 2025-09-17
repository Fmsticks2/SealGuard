const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
    console.log("🚀 Starting SealGuard Multi-Signature deployment...");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());
    
    try {
        // Deploy SealGuardAccessControl first
        console.log("\n📋 Deploying SealGuardAccessControl...");
        const AccessControl = await ethers.getContractFactory("SealGuardAccessControl");
        const accessControl = await AccessControl.deploy();
        await accessControl.deployed();
        console.log("✅ SealGuardAccessControl deployed to:", accessControl.address);
        
        // Deploy SealGuardRegistry
        console.log("\n📄 Deploying SealGuardRegistry...");
        const Registry = await ethers.getContractFactory("SealGuardRegistry");
        const registry = await Registry.deploy(deployer.address, accessControl.address);
        await registry.deployed();
        console.log("✅ SealGuardRegistry deployed to:", registry.address);
        
        // Deploy SealGuardMultiSig
        console.log("\n🔐 Deploying SealGuardMultiSig...");
        const MultiSig = await ethers.getContractFactory("SealGuardMultiSig");
        const multiSig = await MultiSig.deploy(accessControl.address, registry.address);
        await multiSig.deployed();
        console.log("✅ SealGuardMultiSig deployed to:", multiSig.address);
        
        // Set multi-sig contract in registry
        console.log("\n🔗 Linking contracts...");
        const setMultiSigTx = await registry.setMultiSigContract(multiSig.address);
        await setMultiSigTx.wait();
        console.log("✅ Multi-sig contract linked to registry");
        
        // Grant necessary roles
        console.log("\n👥 Setting up roles...");
        
        // Grant VERIFIER_ROLE to deployer for testing
        const verifierRole = await accessControl.VERIFIER_ROLE();
        const grantVerifierTx = await accessControl.grantRole(verifierRole, deployer.address);
        await grantVerifierTx.wait();
        console.log("✅ VERIFIER_ROLE granted to deployer");
        
        // Grant AUDITOR_ROLE to deployer for testing
        const auditorRole = await accessControl.AUDITOR_ROLE();
        const grantAuditorTx = await accessControl.grantRole(auditorRole, deployer.address);
        await grantAuditorTx.wait();
        console.log("✅ AUDITOR_ROLE granted to deployer");
        
        // Test multi-sig configuration
        console.log("\n⚙️ Testing multi-sig configuration...");
        
        // Check if legal documents require multi-sig
        const requiresMultiSig = await registry.typeRequiresMultiSig("legal");
        console.log("Legal documents require multi-sig:", requiresMultiSig);
        
        // Get default multi-sig config
        const defaultConfig = await multiSig.defaultConfig();
        console.log("Default multi-sig config:", {
            minSigners: defaultConfig.minSigners.toString(),
            maxSigners: defaultConfig.maxSigners.toString(),
            approvalThreshold: defaultConfig.approvalThreshold.toString() + "%",
            proposalExpiry: (defaultConfig.proposalExpiry.toNumber() / 86400).toString() + " days"
        });
        
        // Save deployment addresses
        const deploymentData = {
            network: "filecoinCalibration",
            timestamp: new Date().toISOString(),
            contracts: {
                SealGuardAccessControl: {
                    address: accessControl.address,
                    transactionHash: accessControl.deployTransaction.hash
                },
                SealGuardRegistry: {
                    address: registry.address,
                    transactionHash: registry.deployTransaction.hash
                },
                SealGuardMultiSig: {
                    address: multiSig.address,
                    transactionHash: multiSig.deployTransaction.hash
                }
            },
            deployer: deployer.address,
            features: {
                automatedVerification: true,
                multiSignatureWorkflows: true,
                documentLifecycleManagement: true,
                roleBasedAccessControl: true
            }
        };
        
        const deploymentsDir = path.join(__dirname, '..', 'deployments');
        if (!fs.existsSync(deploymentsDir)) {
            fs.mkdirSync(deploymentsDir, { recursive: true });
        }
        
        const deploymentFile = path.join(deploymentsDir, 'filecoinCalibration-multisig.json');
        fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));
        
        console.log("\n📊 Deployment Summary:");
        console.log("========================");
        console.log("🔐 SealGuardAccessControl:", accessControl.address);
        console.log("📄 SealGuardRegistry:", registry.address);
        console.log("🔐 SealGuardMultiSig:", multiSig.address);
        console.log("💾 Deployment data saved to:", deploymentFile);
        
        console.log("\n🎉 Multi-signature deployment completed successfully!");
        console.log("\n📋 Next Steps:");
        console.log("1. Update frontend configuration with new contract addresses");
        console.log("2. Configure multi-sig requirements for different document types");
        console.log("3. Set up automated verification triggers");
        console.log("4. Test multi-signature workflows");
        
        return {
            accessControl: accessControl.address,
            registry: registry.address,
            multiSig: multiSig.address
        };
        
    } catch (error) {
        console.error("❌ Deployment failed:", error);
        throw error;
    }
}

// Execute deployment
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = main;