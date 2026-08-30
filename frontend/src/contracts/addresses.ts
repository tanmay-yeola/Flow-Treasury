import deployedData from './deployedAddresses.json';

export interface DeployedAddresses {
  safeVault: string;
  scopedBudgetModule: string;
  mockToken: string;
}

export const DEFAULT_ADDRESSES: DeployedAddresses = {
  safeVault: deployedData.safeVault || "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  scopedBudgetModule: deployedData.scopedBudgetModule || "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  mockToken: deployedData.mockToken || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
};

export const DEMO_PERSONAS = [
  {
    id: "events-lead",
    name: "Alex (Events Lead)",
    role: "Events & Logistics",
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Account #1 in Hardhat default
    avatarColor: "from-amber-500 to-orange-600",
    badge: "Events Lead ($1,000 / Mo)",
    privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  },
  {
    id: "design-lead",
    name: "Sarah (Design Lead)",
    role: "Design & Creative",
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // Account #2 in Hardhat default
    avatarColor: "from-purple-500 to-pink-600",
    badge: "Design Lead ($500 / Mo)",
    privateKey: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  },
  {
    id: "council-1",
    name: "Elena (Council Signer 1)",
    role: "Multisig Council Owner",
    address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906", // Account #3 in Hardhat default
    avatarColor: "from-blue-500 to-indigo-600",
    badge: "Treasury Council",
    privateKey: "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
  },
  {
    id: "council-2",
    name: "Marcus (Council Signer 2)",
    role: "Multisig Council Owner",
    address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65", // Account #4 in Hardhat default
    avatarColor: "from-emerald-500 to-teal-600",
    badge: "Treasury Council",
    privateKey: "0x47e179ec346fe3a2380580ec8b8b093d10ab7b641d6be029159ecf6b12fa1b0a",
  },
  {
    id: "admin-owner",
    name: "Treasury Admin (Deployer)",
    role: "Root Admin / Owner",
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Account #0 in Hardhat default
    avatarColor: "from-sky-500 to-cyan-600",
    badge: "Admin",
    privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  }
];

export const INITIAL_APPROVED_VENDORS = [
  {
    address: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc", // Account #5
    name: "Campus Catering",
    category: "Food & Refreshments",
    departmentLead: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  },
  {
    address: "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f", // Account #8
    name: "Print Shop",
    category: "Event Merchandise & Posters",
    departmentLead: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  },
  {
    address: "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955", // Account #7
    name: "New Venue & AV Logistics",
    category: "Venue Rentals",
    departmentLead: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  }
];
