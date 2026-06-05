import { formatKES, formatDate, enumLabel } from "@nyumba360/shared";

/**
 * SMS message templates (PRD §6.9). English only for V1 (open question #5);
 * Swahili variants can be added here later without touching call sites.
 */
export const smsTemplates = {
  paymentReceived(name: string, amount: number, receipt: string, balance: number): string {
    return `Dear ${name}, we have received your payment of ${formatKES(amount)} (Receipt ${receipt}). Outstanding balance: ${formatKES(balance)}. Asante - Nyumba360`;
  },

  invoiceGenerated(name: string, amount: number, dueDate: string): string {
    return `Dear ${name}, your rent invoice of ${formatKES(amount)} is due by ${formatDate(dueDate)}. Kindly pay via the provided M-Pesa Paybill. - Nyumba360`;
  },

  newTenantCredentials(name: string, loginEmail: string, tempPassword: string, portalUrl: string): string {
    return `Karibu ${name}! Your Nyumba360 tenant account is ready. Login at ${portalUrl} with email ${loginEmail} and password ${tempPassword}. Please change it after signing in.`;
  },

  maintenanceReceived(unitNumber: string, category: string, priority: string): string {
    return `New maintenance request: Unit ${unitNumber} - ${category} (${enumLabel(priority)} priority). Please review and assign. - Nyumba360`;
  },

  maintenanceStatusUpdated(name: string, category: string, status: string): string {
    return `Dear ${name}, your maintenance request (${category}) is now ${enumLabel(status)}. - Nyumba360`;
  },
};
