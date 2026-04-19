export interface ActivityLogEntry {
  id: string;
  title: string;
  /** ISO 8601 */
  timestamp: string;
  detail?: string;
}
