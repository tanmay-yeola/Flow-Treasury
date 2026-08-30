import { useWeb3 } from '../context/Web3Context';
import { DepartmentBudget, ApprovedVendor } from '../types';

export function useBudgets() {
  const {
    budgets,
    vendors,
    setDepartmentBudget,
    setDepartmentActive,
    setVendorApproval,
    isLoading
  } = useWeb3();

  const getBudgetByLead = (leadAddress: string): DepartmentBudget | undefined => {
    return budgets.find((b) => b.lead.toLowerCase() === leadAddress.toLowerCase());
  };

  const getVendorsForLead = (leadAddress: string): ApprovedVendor[] => {
    return vendors.filter((v) => v.departmentLead.toLowerCase() === leadAddress.toLowerCase());
  };

  return {
    budgets,
    vendors,
    getBudgetByLead,
    getVendorsForLead,
    setDepartmentBudget,
    setDepartmentActive,
    setVendorApproval,
    isLoading,
  };
}
