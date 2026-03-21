import DashboardSidebarNav from "./DashboardSidebarNav";

type Props = { userName: string; isAdmin: boolean };

export default function DashboardNav(props: Props) {
  return <DashboardSidebarNav {...props} />;
}
