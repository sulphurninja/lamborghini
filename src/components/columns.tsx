import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { EditIcon, TrashIcon } from "lucide-react";
import UserDialog from "./UserDialog";

interface UserData {
  _id: string;
  subs_credentials: {
    user_name: string;
  };
  other_preferences: {
    plan: string;
    plan_expiry: Date;
  };
  devices: string[];
}

export const columns: ColumnDef<UserData>[] = [
  {
    accessorKey: "subs_credentials.user_name",
    header: "Username",
  },
  {
    accessorKey: "other_preferences.plan",
    header: "Plan",
  },
  {
    accessorKey: "other_preferences.plan_expiry",
    header: "Expiry Date",
    cell: ({ row }) => {
      const date = new Date(row.getValue("other_preferences.plan_expiry"));
      return date.toLocaleDateString();
    },
  },
  {
    accessorKey: "devices",
    header: "Devices",
    cell: ({ row }) => row.original.devices?.length || 0,
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <div className="flex gap-2">
        <UserDialog
          user={row.original}
          onSuccess={row.table.options.meta?.refreshData}
        >
          <Button size="sm" variant="ghost">
            <EditIcon className="h-4 w-4" />
          </Button>
        </UserDialog>
        <Button size="sm" variant="ghost" onClick={() => {/* Delete handler */}}>
          <TrashIcon className="h-4 w-4 text-red-500" />
        </Button>
      </div>
    )
  }
];
