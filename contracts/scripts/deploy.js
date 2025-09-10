const { ethers } = require("hardhat");

async function main() {
  console.log("Starting SealGuard smart contract deployment...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Deploy SealGuardAccessControl first
  console.log("\nDeploying SealGuardAccessControl...");
  const SealGuardAccessControl = await ethers.getContractFactory("SealGuardAccessControl");
  const accessControl = await SealGuardAccessControl.deploy();
  await accessControl.waitForDeployment();
  const accessControlAddress = await accessControl.getAddress();
  console.log("SealGuardAccessControl deployed to:", accessControlAddress);

  // Deploy SealGuardRegistry
  console.log("\nDeploying SealGuardRegistry...");
  const SealGuardRegistry = await ethers.getContractFactory("SealGuardRegistry");
  const registry = await SealGuardRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("SealGuardRegistry deployed to:", registryAddress);

  // Verify deployment
  console.log("\nVerifying deployments...");
  
  // Check if contracts are deployed correctly
  const registryCode = await ethers.provider.getCode(registryAddress);
  const accessControlCode = await ethers.provider.getCode(accessControlAddress);
  
  if (registryCode === "0x") {
    throw new Error("SealGuardRegistry deployment failed");
  }
  if (accessControlCode === "0x") {
    throw new Error("SealGuardAccessControl deployment failed");
  }

  console.log("✅ All contracts deployed successfully!");
  
  // Save deployment addresses
  const deploymentInfo = {
    network: hre.network.name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      SealGuardRegistry: {
        address: registryAddress,
        transactionHash: registry.deploymentTransaction().hash
      },
      SealGuardAccessControl: {
        address: accessControlAddress,
        transactionHash: accessControl.deploymentTransaction().hash
      }
    }
  };

  // Write deployment info to file
  const fs = require('fs');
  const path = require('path');
  
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const deploymentFile = path.join(deploymentsDir, `${hre.network.name}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`\nDeployment info saved to: ${deploymentFile}`);
  
  // Display summary
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log(`Network: ${hre.network.name}`);
  console.log(`Chain ID: ${deploymentInfo.chainId}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`\nContract Addresses:`);
  console.log(`SealGuardRegistry: ${registryAddress}`);
  console.log(`SealGuardAccessControl: ${accessControlAddress}`);
  console.log("\n" + "=".repeat(60));
  
  // If on a testnet or mainnet, provide verification commands
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\nTo verify contracts on Etherscan, run:");
    console.log(`npx hardhat verify --network ${hre.network.name} ${registryAddress}`);
    console.log(`npx hardhat verify --network ${hre.network.name} ${accessControlAddress}`);
  }
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });