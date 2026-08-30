const { expect } = require("chai");
const hre = require("hardhat");
const { ethers } = hre;
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("ScopedBudgetModule", function () {
  let owner, council1, council2, council3, eventsLead, designLead, vendor1, vendor2, randomUser;
  let mockSafe, mockToken, moduleContract;

  const ETH_ADDRESS = ethers.ZeroAddress;
  const ONE_MONTH = 30 * 24 * 60 * 60; // 30 days in seconds
  const EVENTS_CEILING = ethers.parseUnits("1000", 6); // 1000 USDC
  const DESIGN_CEILING = ethers.parseUnits("500", 6);  // 500 USDC
  const SAFE_INITIAL_BALANCE = ethers.parseUnits("50000", 6); // 50,000 USDC

  beforeEach(async function () {
    [owner, council1, council2, council3, eventsLead, designLead, vendor1, vendor2, randomUser] =
      await ethers.getSigners();

    // 1. Deploy Mock Safe with 3 Council Owners and threshold 2
    const MockSafeFactory = await ethers.getContractFactory("MockSafe");
    const councilOwners = [council1.address, council2.address, council3.address];
    mockSafe = await MockSafeFactory.deploy(councilOwners, 2);
    await mockSafe.waitForDeployment();

    // 2. Deploy Mock Token (USDC, 6 decimals)
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20Factory.deploy("USD Coin", "USDC", 6);
    await mockToken.waitForDeployment();

    // Mint tokens to Safe
    await mockToken.mint(await mockSafe.getAddress(), SAFE_INITIAL_BALANCE);

    // Fund Safe with Native ETH as well
    await owner.sendTransaction({
      to: await mockSafe.getAddress(),
      value: ethers.parseEther("10.0"),
    });

    // 3. Deploy ScopedBudgetModule (Escalation Threshold = 2)
    const ModuleFactory = await ethers.getContractFactory("ScopedBudgetModule");
    moduleContract = await ModuleFactory.deploy(
      await mockSafe.getAddress(),
      owner.address,
      2 // 2 approvals needed for escalations
    );
    await moduleContract.waitForDeployment();

    // Enable Module in Safe
    await mockSafe.enableModule(await moduleContract.getAddress());
  });

  describe("1. Department Role & Policy Configuration", function () {
    it("Allows owner/safe to configure department budgets", async function () {
      // Events Lead: 1000 USDC ceiling, strict vendor whitelist
      await expect(
        moduleContract.setDepartmentBudget(
          eventsLead.address,
          "Events & Logistics",
          await mockToken.getAddress(),
          EVENTS_CEILING,
          ONE_MONTH,
          true // Enforce whitelist
        )
      )
        .to.emit(moduleContract, "BudgetConfigured")
        .withArgs(
          eventsLead.address,
          "Events & Logistics",
          await mockToken.getAddress(),
          EVENTS_CEILING,
          ONE_MONTH,
          true
        );

      const budget = await moduleContract.getBudget(eventsLead.address);
      expect(budget.roleName).to.equal("Events & Logistics");
      expect(budget.monthlyCeiling).to.equal(EVENTS_CEILING);
      expect(budget.isActive).to.be.true;
      expect(budget.enforceVendorWhitelist).to.be.true;
    });

    it("Reverts if non-owner attempts to configure budget", async function () {
      await expect(
        moduleContract.connect(randomUser).setDepartmentBudget(
          eventsLead.address,
          "Events Lead",
          await mockToken.getAddress(),
          EVENTS_CEILING,
          ONE_MONTH,
          true
        )
      ).to.be.revertedWithCustomError(moduleContract, "Unauthorized");
    });

    it("Allows whitelisting vendors individually and in batch", async function () {
      await moduleContract.setVendorApproval(eventsLead.address, vendor1.address, true);
      expect(await moduleContract.isVendorApproved(eventsLead.address, vendor1.address)).to.be.true;

      await moduleContract.setBatchVendorApproval(
        eventsLead.address,
        [vendor1.address, vendor2.address],
        [false, true]
      );
      expect(await moduleContract.isVendorApproved(eventsLead.address, vendor1.address)).to.be.false;
      expect(await moduleContract.isVendorApproved(eventsLead.address, vendor2.address)).to.be.true;
    });
  });

  describe("2. Fast-Path Autonomous Disbursements", function () {
    beforeEach(async function () {
      // Setup Events Lead (Strict Whitelist)
      await moduleContract.setDepartmentBudget(
        eventsLead.address,
        "Events Lead",
        await mockToken.getAddress(),
        EVENTS_CEILING,
        ONE_MONTH,
        true
      );
      await moduleContract.setVendorApproval(eventsLead.address, vendor1.address, true);

      // Setup Design Lead (Open Whitelist)
      await moduleContract.setDepartmentBudget(
        designLead.address,
        "Design Lead",
        await mockToken.getAddress(),
        DESIGN_CEILING,
        ONE_MONTH,
        false // Open whitelist
      );
    });

    it("Executes fast-path payment instantly for approved vendor within ceiling", async function () {
      const spendAmount = ethers.parseUnits("300", 6); // 300 USDC

      await expect(
        moduleContract
          .connect(eventsLead)
          .spendToken(await mockToken.getAddress(), vendor1.address, spendAmount, "ipfs://receipt-catering-001")
      )
        .to.emit(moduleContract, "FastPathExecuted")
        .withArgs(
          eventsLead.address,
          await mockToken.getAddress(),
          vendor1.address,
          spendAmount,
          "ipfs://receipt-catering-001",
          EVENTS_CEILING - spendAmount
        );

      expect(await mockToken.balanceOf(vendor1.address)).to.equal(spendAmount);

      const budget = await moduleContract.getBudget(eventsLead.address);
      expect(budget.spentInCurrentEpoch).to.equal(spendAmount);

      const [remaining] = await moduleContract.getRemainingBudget(eventsLead.address);
      expect(remaining).to.equal(EVENTS_CEILING - spendAmount);
    });

    it("Allows multiple fast-path spends until ceiling is reached", async function () {
      const spend1 = ethers.parseUnits("400", 6);
      const spend2 = ethers.parseUnits("600", 6);

      await moduleContract
        .connect(eventsLead)
        .spendToken(await mockToken.getAddress(), vendor1.address, spend1, "ipfs://receipt-1");

      await moduleContract
        .connect(eventsLead)
        .spendToken(await mockToken.getAddress(), vendor1.address, spend2, "ipfs://receipt-2");

      expect(await mockToken.balanceOf(vendor1.address)).to.equal(spend1 + spend2);

      const [remaining] = await moduleContract.getRemainingBudget(eventsLead.address);
      expect(remaining).to.equal(0);
    });

    it("Allows open-whitelist lead to spend to any vendor within ceiling", async function () {
      const spendAmount = ethers.parseUnits("200", 6);

      await expect(
        moduleContract
          .connect(designLead)
          .spendToken(await mockToken.getAddress(), vendor2.address, spendAmount, "ipfs://figma-subscription")
      )
        .to.emit(moduleContract, "FastPathExecuted");

      expect(await mockToken.balanceOf(vendor2.address)).to.equal(spendAmount);
    });
  });

  describe("3. Escalation Path (Threshold & Policy Violations)", function () {
    beforeEach(async function () {
      await moduleContract.setDepartmentBudget(
        eventsLead.address,
        "Events Lead",
        await mockToken.getAddress(),
        EVENTS_CEILING, // 1000 USDC
        ONE_MONTH,
        true // strict whitelist
      );
      await moduleContract.setVendorApproval(eventsLead.address, vendor1.address, true);
    });

    it("Automatically escalates when spending exceeds monthly ceiling", async function () {
      const overCeilingAmount = ethers.parseUnits("1500", 6); // Exceeds 1000 USDC

      const tx = await moduleContract
        .connect(eventsLead)
        .spendToken(await mockToken.getAddress(), vendor1.address, overCeilingAmount, "ipfs://large-venue-invoice");

      await expect(tx)
        .to.emit(moduleContract, "EscalationCreated")
        .withArgs(
          1,
          eventsLead.address,
          await mockToken.getAddress(),
          vendor1.address,
          overCeilingAmount,
          "ipfs://large-venue-invoice",
          "Ceiling Exceeded"
        );

      // Safe funds should NOT be moved yet
      expect(await mockToken.balanceOf(vendor1.address)).to.equal(0);

      const proposal = await moduleContract.getProposal(1);
      expect(proposal.id).to.equal(1);
      expect(proposal.lead).to.equal(eventsLead.address);
      expect(proposal.amount).to.equal(overCeilingAmount);
      expect(proposal.status).to.equal(1); // PENDING
      expect(proposal.approvalCount).to.equal(0);
    });

    it("Automatically escalates when spending to non-whitelisted vendor", async function () {
      const amount = ethers.parseUnits("200", 6); // within budget, but vendor2 is NOT approved

      await expect(
        moduleContract
          .connect(eventsLead)
          .spendToken(await mockToken.getAddress(), vendor2.address, amount, "ipfs://unapproved-vendor-proof")
      )
        .to.emit(moduleContract, "EscalationCreated")
        .withArgs(
          1,
          eventsLead.address,
          await mockToken.getAddress(),
          vendor2.address,
          amount,
          "ipfs://unapproved-vendor-proof",
          "Unapproved Vendor"
        );
    });
  });

  describe("4. Council Approval, Resolution & Execution", function () {
    const escalatedAmount = ethers.parseUnits("2500", 6);

    beforeEach(async function () {
      await moduleContract.setDepartmentBudget(
        eventsLead.address,
        "Events Lead",
        await mockToken.getAddress(),
        EVENTS_CEILING,
        ONE_MONTH,
        true
      );
      await moduleContract.setVendorApproval(eventsLead.address, vendor1.address, true);

      // Trigger Escalation #1
      await moduleContract
        .connect(eventsLead)
        .spendToken(await mockToken.getAddress(), vendor1.address, escalatedAmount, "ipfs://stage-setup");
    });

    it("Collects council approvals and auto-executes once threshold (2) is met", async function () {
      // Council 1 approves
      await expect(moduleContract.connect(council1).approveEscalation(1))
        .to.emit(moduleContract, "EscalationApproved")
        .withArgs(1, council1.address, 1);

      let proposal = await moduleContract.getProposal(1);
      expect(proposal.approvalCount).to.equal(1);
      expect(proposal.status).to.equal(1); // Still PENDING
      expect(await mockToken.balanceOf(vendor1.address)).to.equal(0);

      // Council 2 approves (Threshold of 2 is met -> auto executes!)
      await expect(moduleContract.connect(council2).approveEscalation(1))
        .to.emit(moduleContract, "EscalationApproved")
        .withArgs(1, council2.address, 2)
        .and.to.emit(moduleContract, "EscalationExecuted")
        .withArgs(1, council2.address, vendor1.address, escalatedAmount);

      proposal = await moduleContract.getProposal(1);
      expect(proposal.status).to.equal(3); // EXECUTED
      expect(await mockToken.balanceOf(vendor1.address)).to.equal(escalatedAmount);
    });

    it("Reverts on duplicate approval by same council member", async function () {
      await moduleContract.connect(council1).approveEscalation(1);
      await expect(
        moduleContract.connect(council1).approveEscalation(1)
      ).to.be.revertedWithCustomError(moduleContract, "AlreadyApproved");
    });

    it("Allows council or owner to cancel an escalation proposal", async function () {
      await expect(
        moduleContract.connect(council1).cancelEscalation(1, "Rejected: Overpriced vendor")
      )
        .to.emit(moduleContract, "EscalationCancelled")
        .withArgs(1, council1.address, "Rejected: Overpriced vendor");

      const proposal = await moduleContract.getProposal(1);
      expect(proposal.status).to.equal(4); // CANCELLED
    });
  });

  describe("5. Monthly Epoch Rollover Accounting", function () {
    beforeEach(async function () {
      await moduleContract.setDepartmentBudget(
        eventsLead.address,
        "Events Lead",
        await mockToken.getAddress(),
        EVENTS_CEILING,
        ONE_MONTH,
        true
      );
      await moduleContract.setVendorApproval(eventsLead.address, vendor1.address, true);

      // Max out the budget for Month 1
      await moduleContract
        .connect(eventsLead)
        .spendToken(await mockToken.getAddress(), vendor1.address, EVENTS_CEILING, "ipfs://month-1-budget");
    });

    it("Resets available allowance after 30 days without manual governance", async function () {
      const [remainingBefore] = await moduleContract.getRemainingBudget(eventsLead.address);
      expect(remainingBefore).to.equal(0);

      // Fast-forward time by 30 days + 1 second
      await time.increase(ONE_MONTH + 1);

      const [remainingAfter] = await moduleContract.getRemainingBudget(eventsLead.address);
      expect(remainingAfter).to.equal(EVENTS_CEILING);

      // Should be able to execute fast-path spend again in the new month
      const spendMonth2 = ethers.parseUnits("500", 6);
      await expect(
        moduleContract
          .connect(eventsLead)
          .spendToken(await mockToken.getAddress(), vendor1.address, spendMonth2, "ipfs://month-2-spend")
      ).to.emit(moduleContract, "EpochRollover");

      expect(await mockToken.balanceOf(vendor1.address)).to.equal(EVENTS_CEILING + spendMonth2);
    });
  });
});
