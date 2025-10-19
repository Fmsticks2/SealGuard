const { ethers } = require("hardhat");
require("dotenv").config();

// Treasury address provided by user
const TREASURY_ADDRESS = "0xC5A684F1B9863FC198078FC114Cb924129c4c5e5";

async function main() {
  console.log("Deploying SubscriptionPayments on:", hre.network.name);

  if (!TREASURY_ADDRESS || !ethers.isAddress(TREASURY_ADDRESS)) {
    throw new Error("Invalid TREASURY_ADDRESS constant.");
  }

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const SubscriptionPayments = await ethers.getContractFactory("SubscriptionPayments");
  const contract = await SubscriptionPayments.deploy(TREASURY_ADDRESS);
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log("SubscriptionPayments deployed at:", address);

  // Save deployment
  const fs = require('fs');
  const path = require('path');
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir, { recursive: true });

  // Load existing file if present
  const file = path.join(deploymentsDir, `${hre.network.name}.json`);
  let info = { network: hre.network.name, chainId: (await ethers.provider.getNetwork()).chainId.toString(), deployer: deployer.address, timestamp: new Date().toISOString(), contracts: {} };
  if (fs.existsSync(file)) {
    try { info = JSON.parse(fs.readFileSync(file, 'utf-8')); } catch {}
  }
  info.contracts = info.contracts || {};
  info.contracts.SubscriptionPayments = {
    address,
    transactionHash: contract.deploymentTransaction().hash,
  };
  fs.writeFileSync(file, JSON.stringify(info, null, 2));
  console.log("Deployment info updated:", file);

  console.log("\nTo verify (if supported):");
  console.log(`npx hardhat verify --network ${hre.network.name} ${address} ${TREASURY_ADDRESS}`);
}

main().catch((e) => { console.error(e); process.exit(1); });