const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

/**
 * Configure subscription plans on the deployed SubscriptionPayments contract.
 * Defaults:
 * - Starter (planId=1): 0.01 tFIL, 30 days
 * - Professional (planId=2): 0.05 tFIL, 30 days
 *
 * Override via env:
 * - STARTER_PRICE_FIL (e.g., "0.02")
 * - PRO_PRICE_FIL (e.g., "0.10")
 * - STARTER_DURATION_DAYS (e.g., "30")
 * - PRO_DURATION_DAYS (e.g., "90")
 * - SUBSCRIPTION_CONTRACT_ADDRESS (if not using deployments JSON)
 */
async function main() {
  const networkName = hre.network.name;
  console.log("Configuring SubscriptionPayments plans on:", networkName);

  // Resolve contract address
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  const deploymentsFile = path.join(deploymentsDir, `${networkName}.json`);

  let contractAddress = process.env.SUBSCRIPTION_CONTRACT_ADDRESS;
  if (!contractAddress) {
    if (!fs.existsSync(deploymentsFile)) {
      throw new Error(
        `No deployments file found for network '${networkName}'. Set SUBSCRIPTION_CONTRACT_ADDRESS env.`
      );
    }
    const info = JSON.parse(fs.readFileSync(deploymentsFile, "utf-8"));
    if (!info.contracts || !info.contracts.SubscriptionPayments || !info.contracts.SubscriptionPayments.address) {
      throw new Error(
        `SubscriptionPayments not found in ${deploymentsFile}. Set SUBSCRIPTION_CONTRACT_ADDRESS env.`
      );
    }
    contractAddress = info.contracts.SubscriptionPayments.address;
  }

  // Plan configuration (from env or defaults)
  const STARTER_PRICE_FIL = process.env.STARTER_PRICE_FIL || "45"; // tFIL
  const PRO_PRICE_FIL = process.env.PRO_PRICE_FIL || "150"; // tFIL
  const STARTER_DURATION_DAYS = parseInt(process.env.STARTER_DURATION_DAYS || "30", 10);
  const PRO_DURATION_DAYS = parseInt(process.env.PRO_DURATION_DAYS || "30", 10);

  const toWei = (filStr) => ethers.parseUnits(filStr, 18);
  const toSeconds = (days) => BigInt(days) * 24n * 60n * 60n;

  const plans = [
    { planId: 1, priceWei: toWei(STARTER_PRICE_FIL), durationSeconds: toSeconds(STARTER_DURATION_DAYS) },
    { planId: 2, priceWei: toWei(PRO_PRICE_FIL), durationSeconds: toSeconds(PRO_DURATION_DAYS) },
  ];

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Contract:", contractAddress);

  const sub = await ethers.getContractAt("SubscriptionPayments", contractAddress);

  for (const p of plans) {
    console.log(`\nSetting plan ${p.planId}: price=${p.priceWei} wei, duration=${p.durationSeconds} seconds`);
    const tx = await sub.setPlan(p.planId, p.priceWei, p.durationSeconds);
    console.log("Submitted:", tx.hash);
    const receipt = await tx.wait();
    console.log("Confirmed in block:", receipt.blockNumber);
  }

  // Read back and display configured plans
  console.log("\nReading back configured plans:");
  for (const p of plans) {
    const plan = await sub.plans(p.planId);
    console.log(
      `Plan ${p.planId}: price=${plan.price} wei, duration=${plan.durationSeconds} seconds, exists=${plan.exists}`
    );
  }

  console.log("\nDone configuring subscription plans.");
}

main().catch((err) => {
  console.error("Failed to configure plans:", err);
  process.exit(1);
});