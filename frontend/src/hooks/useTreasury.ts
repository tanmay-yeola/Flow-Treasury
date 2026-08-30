import { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../context/Web3Context';

export function useTreasury() {
  const {
    safeBalance,
    ethBalance,
    networkName,
    account,
    contractAddresses,
    refreshData,
    isLoading
  } = useWeb3();

  return {
    safeBalance,
    ethBalance,
    networkName,
    account,
    safeAddress: contractAddresses.safeVault,
    moduleAddress: contractAddresses.scopedBudgetModule,
    tokenAddress: contractAddresses.mockToken,
    refreshTreasury: refreshData,
    isLoading,
  };
}
