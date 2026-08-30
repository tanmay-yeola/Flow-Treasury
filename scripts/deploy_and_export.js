const hre = require("hardhat");
const { ethers } = hre;
const fs = require("fs");
const path = require("path");

async function main() {
  const [admin, council1, council2, council3, eventsLead, designLead, cateringVendor, avVendor] =
    await ethers.getSigners();

  console.log("----------------------------------------------------");
  console.log("Deploying FlowTreasury contracts with account:", admin.address);
  console.log("----------------------------------------------------");

  // 1. Deploy MockSafe with Council Signers (Threshold: 2)
  const MockSafe = await ethers.getContractFactory("MockSafe");
  const councilOwners = [council1.address, council2.address, council3.address];
  const mockSafe = await MockSafe.deploy(councilOwners, 2);
  await mockSafe.waitForDeployment();
  const safeAddress = await mockSafe.getAddress();
  console.log("Deployed MockSafe at:", safeAddress);

  // 2. Deploy MockERC20 (USDC, 6 decimals)
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const mockUSDC = await MockERC20.deploy("USD Coin", "USDC", 6);
  await mockUSDC.waitForDeployment();
  const usdcAddress = await mockUSDC.getAddress();
  console.log("Deployed MockERC20 (USDC) at:", usdcAddress);

  // Fund Safe with $50,000 USDC and 10 ETH
  await mockUSDC.mint(safeAddress, ethers.parseUnits("50000", 6));
  await admin.sendTransaction({
    to: safeAddress,
    value: ethers.parseEther("10.0"),
  });
  console.log("Funded Safe with $50,000 USDC and 10 ETH");

  // 3. Deploy ScopedBudgetModule (Escalation Threshold = 2)
  const ScopedBudgetModule = await ethers.getContractFactory("ScopedBudgetModule");
  const moduleContract = await ScopedBudgetModule.deploy(
    safeAddress,
    admin.address,
    2 // 2 Council Approvals Required
  );
  await moduleContract.waitForDeployment();
  const moduleAddress = await moduleContract.getAddress();
  console.log("Deployed ScopedBudgetModule at:", moduleAddress);

  // Enable Module in Safe
  await mockSafe.enableModule(moduleAddress);
  console.log("Enabled Module in Safe");

  // 4. Configure Initial Department Budgets
  const ONE_MONTH = 30 * 24 * 60 * 60;

  // Events Lead: $1,000 / month, Strict Whitelist
  await moduleContract.setDepartmentBudget(
    eventsLead.address,
    "Events & Logistics",
    usdcAddress,
    ethers.parseUnits("1000", 6),
    ONE_MONTH,
    true
  );
  await moduleContract.setVendorApproval(eventsLead.address, cateringVendor.address, true);
  await moduleContract.setVendorApproval(eventsLead.address, avVendor.address, true);
  console.log("Configured Events Lead ($1,000 cap, whitelisted catering & AV)");

  // Design Lead: $500 / month, Open Policy
  await moduleContract.setDepartmentBudget(
    designLead.address,
    "Design & Creative",
    usdcAddress,
    ethers.parseUnits("500", 6),
    ONE_MONTH,
    false
  );
  console.log("Configured Design Lead ($500 cap, open vendor policy)");

  // 5. Export Contract Addresses to Frontend
  const outputData = {
    network: hre.network.name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    safeVault: safeAddress,
    scopedBudgetModule: moduleAddress,
    mockToken: usdcAddress,
    deployedAt: new Date().toISOString(),
    councilSigners: councilOwners,
    leads: {
      eventsLead: eventsLead.address,
      designLead: designLead.address,
    },
    vendors: {
      cateringVendor: cateringVendor.address,
      avVendor: avVendor.address,
    }
  };

  const exportPath = path.join(__dirname, "..", "frontend", "src", "contracts", "deployedAddresses.json");
  fs.writeFileSync(exportPath, JSON.stringify(outputData, null, 2));
  console.log("Exported deployed addresses to:", exportPath);
  console.log("----------------------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
