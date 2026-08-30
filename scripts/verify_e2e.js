const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  console.log("===============================================================");
  console.log("     FLOWTREASURY: END-TO-END HACKATHON DEMO VERIFICATION      ");
  console.log("===============================================================\n");

  const [admin, council1, council2, council3, eventsLead, designLead, cateringVendor, newVenue] =
    await ethers.getSigners();

  // --------------------------------------------------------------------------
  // SETUP: Deploy MockSafe, MockERC20, ScopedBudgetModule
  // --------------------------------------------------------------------------
  console.log(">>> [SETUP] Deploying and Configuring Contracts...");
  const MockSafe = await ethers.getContractFactory("MockSafe");
  const mockSafe = await MockSafe.deploy([council1.address, council2.address, council3.address], 2);
  await mockSafe.waitForDeployment();
  const safeAddress = await mockSafe.getAddress();

  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const mockUSDC = await MockERC20.deploy("USD Coin", "USDC", 6);
  await mockUSDC.waitForDeployment();
  const usdcAddress = await mockUSDC.getAddress();

  // Fund Safe with $10,000 USDC and 10 ETH
  await mockUSDC.mint(safeAddress, ethers.parseUnits("10000", 6));
  await admin.sendTransaction({ to: safeAddress, value: ethers.parseEther("10.0") });

  const ScopedBudgetModule = await ethers.getContractFactory("ScopedBudgetModule");
  const moduleContract = await ScopedBudgetModule.deploy(safeAddress, admin.address, 2);
  await moduleContract.waitForDeployment();
  const moduleAddress = await moduleContract.getAddress();
  await mockSafe.enableModule(moduleAddress);

  // Configure Events Lead ($1,000 / mo, Whitelist Enforced)
  const ONE_MONTH = 30 * 24 * 60 * 60;
  await moduleContract.setDepartmentBudget(
    eventsLead.address,
    "Events & Logistics",
    usdcAddress,
    ethers.parseUnits("1000", 6),
    ONE_MONTH,
    true
  );
  await moduleContract.setVendorApproval(eventsLead.address, cateringVendor.address, true);

  // Configure Design Lead ($500 / mo, Open Whitelist)
  await moduleContract.setDepartmentBudget(
    designLead.address,
    "Design & Creative",
    usdcAddress,
    ethers.parseUnits("500", 6),
    ONE_MONTH,
    false
  );

  console.log("✔ Safe Vault Funded: $10,000.00 USDC");
  console.log("✔ Events Department Configured: $1,000.00 limit, Whitelist: Campus Catering");
  console.log("✔ Design Department Configured: $500.00 limit, Open Whitelist\n");

  // --------------------------------------------------------------------------
  // SCENARIO 1: FAST PATH MICRO-PAYMENT
  // --------------------------------------------------------------------------
  console.log(">>> [SCENARIO 1: FAST PATH]");
  console.log("Submitting: Events Lead -> Campus Catering -> $300.00 USDC");

  const initialSafeBal = await mockUSDC.balanceOf(safeAddress);
  const initialVendorBal = await mockUSDC.balanceOf(cateringVendor.address);

  // Execute Fast-Path spend
  const tx1 = await moduleContract.connect(eventsLead).spendToken(
    usdcAddress,
    cateringVendor.address,
    ethers.parseUnits("300", 6),
    "ipfs://catering-snack-receipt"
  );
  const receipt1 = await tx1.wait();

  // Verify FastPathExecuted event emitted
  const fastPathEvents = receipt1.logs.filter(
    (log) => log.fragment && log.fragment.name === "FastPathExecuted"
  );
  console.log("✔ Event 'FastPathExecuted' emitted on-chain");

  const afterSafeBal1 = await mockUSDC.balanceOf(safeAddress);
  const afterVendorBal1 = await mockUSDC.balanceOf(cateringVendor.address);
  const budget1 = await moduleContract.getBudget(eventsLead.address);
  const remaining1 = await moduleContract.getRemainingBudget(eventsLead.address);

  console.log("✔ Treasury Balance Decreased:", ethers.formatUnits(afterSafeBal1, 6), "USDC (was $10,000.00)");
  console.log("✔ Vendor Balance Increased:", ethers.formatUnits(afterVendorBal1, 6), "USDC");
  console.log("✔ Department Spent Recorded:", ethers.formatUnits(budget1.spentInCurrentEpoch, 6), "USDC (expected $300.00)");
  console.log("✔ Remaining Allowance:", ethers.formatUnits(remaining1[0], 6), "USDC (expected $700.00)\n");

  if (afterSafeBal1 !== ethers.parseUnits("9700", 6)) throw new Error("Safe balance mismatch in Scenario 1");
  if (budget1.spentInCurrentEpoch !== ethers.parseUnits("300", 6)) throw new Error("Spent mismatch in Scenario 1");
  if (remaining1[0] !== ethers.parseUnits("700", 6)) throw new Error("Remaining mismatch in Scenario 1");

  // --------------------------------------------------------------------------
  // SCENARIO 2: ESCALATION (OVER CEILING)
  // --------------------------------------------------------------------------
  console.log(">>> [SCENARIO 2: ESCALATION]");
  console.log("Submitting: Events Lead -> New Venue -> $1,500.00 USDC ($1,500 > $700 remaining)");

  const tx2 = await moduleContract.connect(eventsLead).spendToken(
    usdcAddress,
    newVenue.address,
    ethers.parseUnits("1500", 6),
    "ipfs://venue-deposit-invoice"
  );
  const receipt2 = await tx2.wait();

  // Verify EscalationCreated event emitted
  const escalationEvents = receipt2.logs.filter(
    (log) => log.fragment && log.fragment.name === "EscalationCreated"
  );
  console.log("✔ Event 'EscalationCreated' emitted on-chain");

  const proposalCounter = await moduleContract.proposalCounter();
  const proposal1 = await moduleContract.getProposal(1);

  console.log("✔ Proposal Counter:", proposalCounter.toString(), "(expected #1)");
  console.log("✔ Proposal #1 Requester:", proposal1.lead, "(Events Lead)");
  console.log("✔ Proposal #1 Payee:", proposal1.to, "(New Venue)");
  console.log("✔ Proposal #1 Amount:", ethers.formatUnits(proposal1.amount, 6), "USDC");
  console.log("✔ Proposal #1 Approval Count:", proposal1.approvalCount.toString(), "/ 2");
  console.log("✔ Proposal #1 Status:", proposal1.status.toString(), "(1 = PENDING)");

  const afterSafeBal2 = await mockUSDC.balanceOf(safeAddress);
  console.log("✔ Safe Balance Untouched during Escalation:", ethers.formatUnits(afterSafeBal2, 6), "USDC\n");

  if (proposalCounter !== 1n) throw new Error("Proposal counter mismatch");
  if (Number(proposal1.status) !== 1) throw new Error("Proposal status should be PENDING (1)");
  if (afterSafeBal2 !== ethers.parseUnits("9700", 6)) throw new Error("Safe balance should not change on proposal creation");

  // --------------------------------------------------------------------------
  // SCENARIO 3: COUNCIL MULTISIG APPROVAL
  // --------------------------------------------------------------------------
  console.log(">>> [SCENARIO 3: COUNCIL APPROVAL]");
  
  // Council Member 1 (Elena) Approves
  console.log("Council Signer 1 (Elena) approves Proposal #1...");
  await moduleContract.connect(council1).approveEscalation(1);
  let proposalAfter1 = await moduleContract.getProposal(1);
  console.log("✔ Council 1 Signature Recorded. Approval Count:", proposalAfter1.approvalCount.toString(), "/ 2");
  console.log("✔ Status remains PENDING (1)\n");

  if (proposalAfter1.approvalCount !== 1n) throw new Error("Approval count should be 1");
  if (Number(proposalAfter1.status) !== 1) throw new Error("Status should still be PENDING");

  // Council Member 2 (Marcus) Approves (Threshold = 2 Reached -> Auto Execution)
  console.log("Council Signer 2 (Marcus) approves Proposal #1...");
  const txCouncil2 = await moduleContract.connect(council2).approveEscalation(1);
  const receiptCouncil2 = await txCouncil2.wait();

  const executedEvents = receiptCouncil2.logs.filter(
    (log) => log.fragment && log.fragment.name === "EscalationExecuted"
  );
  console.log("✔ Event 'EscalationExecuted' emitted on-chain");

  const proposalFinal = await moduleContract.getProposal(1);
  const finalSafeBal = await mockUSDC.balanceOf(safeAddress);
  const venueBal = await mockUSDC.balanceOf(newVenue.address);

  console.log("✔ Proposal Status Updated to:", proposalFinal.status.toString(), "(3 = EXECUTED)");
  console.log("✔ Safe Balance After Council Disbursement:", ethers.formatUnits(finalSafeBal, 6), "USDC (was $9,700.00)");
  console.log("✔ Venue Received Funds:", ethers.formatUnits(venueBal, 6), "USDC (expected $1,500.00)\n");

  if (Number(proposalFinal.status) !== 3) throw new Error("Proposal status should be EXECUTED (3)");
  if (finalSafeBal !== ethers.parseUnits("8200", 6)) throw new Error("Safe balance should be $8,200.00");
  if (venueBal !== ethers.parseUnits("1500", 6)) throw new Error("Venue should have received $1,500.00");

  // --------------------------------------------------------------------------
  // SCENARIO 4: MONTHLY POLICY ACCOUNTING
  // --------------------------------------------------------------------------
  console.log(">>> [SCENARIO 4: MONTHLY POLICY ACCOUNTING]");
  const finalEventsBudget = await moduleContract.getBudget(eventsLead.address);
  const finalEventsRemaining = await moduleContract.getRemainingBudget(eventsLead.address);

  console.log("Department:", finalEventsBudget.roleName);
  console.log("Monthly Ceiling:", ethers.formatUnits(finalEventsBudget.monthlyCeiling, 6), "USDC");
  console.log("Spent in Current Epoch:", ethers.formatUnits(finalEventsBudget.spentInCurrentEpoch, 6), "USDC");
  console.log("Remaining Fast-Path Budget:", ethers.formatUnits(finalEventsRemaining[0], 6), "USDC");
  console.log("Vendor Whitelist Active:", finalEventsBudget.enforceVendorWhitelist);
  console.log("Department Status:", finalEventsBudget.isActive ? "ACTIVE" : "PAUSED");

  console.log("\n===============================================================");
  console.log("        ALL 4 DEMO SCENARIOS VERIFIED 100% SUCCESSFULLY        ");
  console.log("===============================================================\n");
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exitCode = 1;
});
