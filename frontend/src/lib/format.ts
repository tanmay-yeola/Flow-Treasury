/**
 * Utility formatting functions for FlowTreasury
 */

export function shortenAddress(addr: string, chars: number = 4): string {
  if (!addr || addr.length < 10) return addr || '';
  return `${addr.substring(0, chars + 2)}...${addr.substring(addr.length - chars).toUpperCase()}`;
}

export function formatUSDC(amount: bigint | number | string, decimals: number = 6): string {
  try {
    const num = typeof amount === 'bigint' 
      ? Number(amount) / 10 ** decimals 
      : typeof amount === 'string' 
      ? parseFloat(amount) 
      : amount;
    
    if (isNaN(num)) return '$0.00';
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } catch {
    return '$0.00';
  }
}

export function formatEpochRemaining(epochStartSec: number, epochDurationSec: number): {
  daysRemaining: number;
  label: string;
  resetDateFormatted: string;
} {
  const endSec = epochStartSec + epochDurationSec;
  const nowSec = Math.floor(Date.now() / 1000);
  const secondsLeft = Math.max(endSec - nowSec, 0);
  const days = Math.ceil(secondsLeft / 86400);

  const resetDate = new Date(endSec * 1000);
  const resetDateFormatted = resetDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return {
    daysRemaining: days,
    label: days === 0 ? 'Today' : `${days} days`,
    resetDateFormatted,
  };
}

export function getExplorerTxLink(txHash: string, chainId: string | number = 31337): string {
  if (!txHash) return '#';
  if (chainId === 11155111 || chainId === '11155111') {
    return `https://sepolia.etherscan.io/tx/${txHash}`;
  }
  if (chainId === 84532 || chainId === '84532') {
    return `https://sepolia.basescan.org/tx/${txHash}`;
  }
  if (chainId === 80002 || chainId === '80002') {
    return `https://amoy.polygonscan.com/tx/${txHash}`;
  }
  // Local Hardhat / dev
  return `https://etherscan.io/tx/${txHash}`;
}

export function getExplorerAddressLink(address: string, chainId: string | number = 31337): string {
  if (!address) return '#';
  if (chainId === 11155111 || chainId === '11155111') {
    return `https://sepolia.etherscan.io/address/${address}`;
  }
  if (chainId === 84532 || chainId === '84532') {
    return `https://sepolia.basescan.org/address/${address}`;
  }
  return `https://etherscan.io/address/${address}`;
}
