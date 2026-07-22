import type { TaskSnapshot } from "../../types/api";

type RecentTasksTableProps = {
  tasks: TaskSnapshot[];
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
};

/**
 * Dashboard Overview:
 * Recent Tasks panel is intentionally hidden from the landing overview.
 *
 * Notes:
 * - Keep this component exported so existing parent imports stay safe.
 * - Keep props shape unchanged so no parent component needs to be patched.
 * - /tasks page remains unaffected because Tasks Center uses a separate view.
 */
export function RecentTasksTable(props: RecentTasksTableProps) {
  void props;

  return null;
}