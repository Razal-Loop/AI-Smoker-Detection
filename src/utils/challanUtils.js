/**
 * Shared challan helpers for status color, date formatting, and display.
 * Use theme from caller when needed for consistency.
 */

export const CHALLAN_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  CANCELLED: 'cancelled',
};

/**
 * @param {string} status - challan status
 * @param {{ warning?: string, success?: string, error?: string }} [colors] - optional theme colors
 * @returns {string} hex color
 */
export function getStatusColor(status, colors = {}) {
  const { warning = '#f59e0b', success = '#10b981', error = '#ef4444' } = colors;
  switch (status) {
    case CHALLAN_STATUS.PENDING:
      return warning;
    case CHALLAN_STATUS.PAID:
      return success;
    case CHALLAN_STATUS.CANCELLED:
      return error;
    default:
      return '#64748b';
  }
}

/**
 * @param {string} [dateString] - ISO date string
 * @param {boolean} [includeTime] - include time in output
 * @returns {string}
 */
export function formatChallanDate(dateString, includeTime = false) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'N/A';
  return includeTime
    ? date.toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}
