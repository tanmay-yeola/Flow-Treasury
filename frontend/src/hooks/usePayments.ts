import { useWeb3 } from '../context/Web3Context';

export function usePayments() {
  const {
    spend,
    transactions,
    isLoading
  } = useWeb3();

  return {
    submitPayment: spend,
    transactions,
    isLoading,
  };
}
