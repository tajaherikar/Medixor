import { UsersList } from "@/components/users/users-list";

interface UsersPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function UsersPage({ params }: UsersPageProps) {
  const { tenant } = await params;
  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold">Team Members</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage who has access to this workspace and their permissions.
        </p>
      </div>
      <UsersList tenant={tenant} />
    </div>
  );
}
