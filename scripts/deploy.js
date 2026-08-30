const hre = require("hardhat");
const { ethers } = hre;
const fs = require("fs");
const path = require("path");

async function main() {
  // 1. Get Hardhat Signers according to specified assignment:
  // accounts[0] = Owner / President
  // accounts[1] = Events Lead
  // accounts[2] = Design Lead
  // accounts[3] = Council Member 1
  // accounts[4] = Council Member 2
  // accounts[5] = Approved Vendor / Campus Catering
  // accounts[6] = Unapproved Vendor
  const [
    owner,
    eventsLead,
    designLead,
    council1,
    council2,
    approvedVendor,
    unapprovedVendor,
  ] = await ethers.getSigners();

  const isLocalhost = hre.network.name === "localhost" || hre.network.name === "hardhat";

  console.log("====================================================");
  console.log("     FLOWTREASURY: LOCALHOST DEPLOYMENT FLOW        ");
  console.log("====================================================");
  console.log("Deployer / Owner Account:", owner.address);
  console.log("Network:", hre.network.name);
  console.log("----------------------------------------------------");

  // 2. Deploy MockSafe with Council Signers (Council 1 & Council 2, Threshold: 2)
  let safeAddress = process.env.SAFE_ADDRESS;
  let mockSafe;
  const councilOwners = [council1.address, council2.address];
  const safeThreshold = 2;

  if (!safeAddress) {
    console.log("Deploying MockSafe with Council signers (Threshold: 2)...");
    const MockSafe = await ethers.getContractFactory("MockSafe");
    mockSafe = await MockSafe.deploy(councilOwners, safeThreshold);
    await mockSafe.waitForDeployment();
    safeAddress = await mockSafe.getAddress();
  } else {
    mockSafe = await ethers.getContractAt("MockSafe", safeAddress);
  }

  // 3. Deploy MockERC20 Token (USDC, 6 decimals) and Fund MockSafe
  let tokenAddress = process.env.TOKEN_ADDRESS;
  let mockToken;
  if (!tokenAddress) {
    console.log("Deploying MockERC20 (USDC, 6 decimals)...");
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20.deploy("USD Coin", "USDC", 6);
    await mockToken.waitForDeployment();
    tokenAddress = await mockToken.getAddress();

    // Fund MockSafe with 10,000 USDC
    const fundAmount = ethers.parseUnits("10000", 6);
    await mockToken.mint(safeAddress, fundAmount);
    console.log("Funded Safe with 10,000 USDC");
  } else {
    mockToken = await ethers.getContractAt("MockERC20", tokenAddress);
  }

  // Also fund MockSafe with native ETH (10.0 ETH)
  try {
    await owner.sendTransaction({
      to: safeAddress,
      value: ethers.parseEther("10.0"),
    });
    console.log("Funded Safe with 10.0 Native ETH");
  } catch (e) {
    // Non-critical if insufficient balance
  }

  // 4. Deploy ScopedBudgetModule (Escalation Threshold = 2)
  const escalationThreshold = 2;
  console.log("Deploying ScopedBudgetModule (Escalation Threshold: 2)...");
  const ScopedBudgetModule = await ethers.getContractFactory("ScopedBudgetModule");
  const moduleContract = await ScopedBudgetModule.deploy(
    safeAddress,
    owner.address,
    escalationThreshold
  );
  await moduleContract.waitForDeployment();
  const moduleAddress = await moduleContract.getAddress();

  // 5. Enable ScopedBudgetModule on MockSafe
  console.log("Enabling ScopedBudgetModule on MockSafe...");
  await mockSafe.enableModule(moduleAddress);

  // 6. Configure Events Lead:
  // monthly budget = 1000 units, strict vendor whitelist
  const ONE_MONTH = 30 * 24 * 60 * 60; // 30 days
  console.log("Configuring Events Lead budget (1,000 units, whitelist enforced)...");
  await moduleContract.setDepartmentBudget(
    eventsLead.address,
    "Events & Logistics",
    tokenAddress,
    ethers.parseUnits("1000", 6),
    ONE_MONTH,
    true
  );

  // 7. Whitelist accounts[5] as an approved vendor for Events Lead
  console.log("Whitelisting Approved Vendor (accounts[5]) for Events Lead...");
  await moduleContract.setVendorApproval(
    eventsLead.address,
    approvedVendor.address,
    true
  );

  // 8. Configure Design Lead:
  // monthly budget = 500 units, open vendor policy
  console.log("Configuring Design Lead budget (500 units, open whitelist)...");
  await moduleContract.setDepartmentBudget(
    designLead.address,
    "Design & Creative",
    tokenAddress,
    ethers.parseUnits("500", 6),
    ONE_MONTH,
    false
  );

  // 9. Fetch and Verify State from Contracts
  const eventsBudget = await moduleContract.getBudget(eventsLead.address);
  const designBudget = await moduleContract.getBudget(designLead.address);
  const safeTokenBal = await mockToken.balanceOf(safeAddress);
  const safeEthBal = await ethers.provider.getBalance(safeAddress);
  const isModuleEnabled = await mockSafe.isModule(moduleAddress);

  // 10. Automatically export addresses to frontend
  const frontendDir = path.join(__dirname, "..", "frontend");
  const deployedAddressesPath = path.join(frontendDir, "src", "contracts", "deployedAddresses.json");
  const envPath = path.join(frontendDir, ".env");

  const networkConfig = await ethers.provider.getNetwork();
  const exportData = {
    network: hre.network.name,
    chainId: networkConfig.chainId.toString(),
    safeVault: safeAddress,
    scopedBudgetModule: moduleAddress,
    mockToken: tokenAddress,
    deployedAt: new Date().toISOString(),
    councilSigners: councilOwners,
    leads: {
      eventsLead: eventsLead.address,
      designLead: designLead.address,
    },
    vendors: {
      cateringVendor: approvedVendor.address,
      unapprovedVendor: unapprovedVendor.address,
    }
  };

  try {
    if (fs.existsSync(path.dirname(deployedAddressesPath))) {
      fs.writeFileSync(deployedAddressesPath, JSON.stringify(exportData, null, 2));
      console.log("Updated frontend deployedAddresses.json");
    }

    const envContent = [
      `VITE_SAFE_ADDRESS=${safeAddress}`,
      `VITE_MODULE_ADDRESS=${moduleAddress}`,
      `VITE_TOKEN_ADDRESS=${tokenAddress}`,
      `VITE_CHAIN_ID=${networkConfig.chainId.toString()}`,
      `VITE_DEMO_MODE=false`,
      ""
    ].join("\n");
    fs.writeFileSync(envPath, envContent);
    console.log("Updated frontend .env file");
  } catch (e) {
    console.warn("Could not export frontend configuration:", e.message);
  }

  // 11. Print Clean Deployment Summary
  console.log("\n====================================================");
  console.log("           DEPLOYMENT SUMMARY (LOCALHOST)           ");
  console.log("====================================================");
  console.log(`SAFE_ADDRESS=${safeAddress}`);
  console.log(`MODULE_ADDRESS=${moduleAddress}`);
  console.log(`TOKEN_ADDRESS=${tokenAddress}`);
  console.log(`OWNER=${owner.address}`);
  console.log(`EVENTS_LEAD=${eventsLead.address}`);
  console.log(`DESIGN_LEAD=${designLead.address}`);
  console.log(`COUNCIL_1=${council1.address}`);
  console.log(`COUNCIL_2=${council2.address}`);
  console.log(`APPROVED_VENDOR=${approvedVendor.address}`);
  console.log(`UNAPPROVED_VENDOR=${unapprovedVendor.address}`);
  console.log("----------------------------------------------------");
  console.log(`Events Budget: ${ethers.formatUnits(eventsBudget.monthlyCeiling, 6)} USDC / month (Whitelist: ${eventsBudget.enforceVendorWhitelist ? "Enforced" : "Open"})`);
  console.log(`Design Budget: ${ethers.formatUnits(designBudget.monthlyCeiling, 6)} USDC / month (Whitelist: ${designBudget.enforceVendorWhitelist ? "Enforced" : "Open"})`);
  console.log(`Safe Balance: ${ethers.formatUnits(safeTokenBal, 6)} USDC (${ethers.formatEther(safeEthBal)} ETH)`);
  console.log(`Module Enabled Status: ${isModuleEnabled}`);
  console.log("====================================================\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
