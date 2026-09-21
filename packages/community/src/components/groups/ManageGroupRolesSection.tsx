import { Button, Switch, Tabs, TabsList, TabsTrigger } from "@flaner/ui-components";
import { Settings, Share2, Shield, ShieldAlert, ShieldCheck, UserPlus, Users } from "lucide-react";
import { useMemo, useState } from "react";
import {
  type ConfigurableGroupRole,
  type Group,
  type GroupPermission,
  type RolePermissionsMap,
  getAllGroupRolePermissions,
} from "../../api/groups";
import { useUpdateGroupRolePermissionsMutation } from "../../hooks/api/mutation";
import { useCommunityTranslations } from "../../hooks/useCommunityTranslations";
import { manageGroupRolesSectionStyles } from "./ManageGroupRolesSection.styles";

interface ManageGroupRolesSectionProps {
  groupId: string;
  group: Group | null | undefined;
}

const ROLES: {
  key: ConfigurableGroupRole;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}[] = [
  { key: "admin", labelKey: "manageGroupSheet.role_admin", icon: ShieldCheck, iconColor: "text-blue-500" },
  { key: "moderator", labelKey: "manageGroupSheet.role_moderator", icon: ShieldAlert, iconColor: "text-orange-500" },
  { key: "member", labelKey: "manageGroupSheet.role_member", icon: Shield, iconColor: "text-muted-foreground" },
];

const PERMISSION_CONFIG: {
  key: GroupPermission;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: "editGroup", icon: Settings },
  { key: "manageMembers", icon: Users },
  { key: "manageRequests", icon: UserPlus },
  { key: "inviteMembers", icon: Share2 },
];

export function ManageGroupRolesSection({ groupId, group }: ManageGroupRolesSectionProps) {
  const { t } = useCommunityTranslations();
  const [activeRole, setActiveRole] = useState<ConfigurableGroupRole>("admin");
  const [permissionsState, setPermissionsState] = useState<RolePermissionsMap>(() =>
    getAllGroupRolePermissions(group)
  );

  const initialPermissions = useMemo(
    () => getAllGroupRolePermissions(group),
    [group]
  );

  const isDirty = useMemo(() => {
    const roles: ConfigurableGroupRole[] = ["admin", "moderator", "member"];
    const perms: GroupPermission[] = ["editGroup", "manageMembers", "manageRequests", "inviteMembers"];
    return roles.some((role) =>
      perms.some((perm) => permissionsState[role]?.[perm] !== initialPermissions[role]?.[perm])
    );
  }, [permissionsState, initialPermissions]);

  const updatePermissionsMutation = useUpdateGroupRolePermissionsMutation();

  const handleToggle = (role: ConfigurableGroupRole, permission: GroupPermission, value: boolean) => {
    setPermissionsState((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [permission]: value,
      },
    }));
  };

  const onSave = async () => {
    try {
      await updatePermissionsMutation.mutateAsync({
        groupId,
        rolePermissions: permissionsState,
      });
    } catch {
      // Toast błędu obsłużony przez mutację
    }
  };

  return (
    <div className={manageGroupRolesSectionStyles.container}>
      <p className={manageGroupRolesSectionStyles.rolesDesc}>
        {t("manageGroupSheet.rolesDesc")}
      </p>

      {/* Zakładki ról */}
      <Tabs
        value={activeRole}
        onValueChange={(val) => setActiveRole(val as ConfigurableGroupRole)}
        className="w-full"
      >
        <TabsList className={manageGroupRolesSectionStyles.tabsList}>
          {ROLES.map(({ key, labelKey, icon: Icon, iconColor }) => (
            <TabsTrigger
              key={key}
              value={key}
              className={manageGroupRolesSectionStyles.tabsTrigger}
            >
              <Icon className={`size-3.5 ${iconColor}`} />
              <span>{t(labelKey)}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Lista uprawnień dla aktywnej roli */}
      <div className={manageGroupRolesSectionStyles.permissionsList}>
        {PERMISSION_CONFIG.map(({ key, icon: Icon }) => {
          const isChecked = permissionsState[activeRole]?.[key] ?? false;
          const switchId = `perm-${activeRole}-${key}`;

          return (
            <div key={key} className={manageGroupRolesSectionStyles.permissionCard}>
              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                <div className="p-1.5 rounded-lg bg-muted/60 text-muted-foreground shrink-0 mt-0.5">
                  <Icon className="size-3.5" />
                </div>
                <div className={manageGroupRolesSectionStyles.permissionInfo}>
                  <Switch
                    id={switchId}
                    label={t(`manageGroupSheet.permissions.${key}.title`)}
                    description={t(`manageGroupSheet.permissions.${key}.desc`)}
                    checked={isChecked}
                    onChange={(e) => handleToggle(activeRole, key, e.target.checked)}
                    disabled={updatePermissionsMutation.isPending}
                    className="py-0"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Przycisk zapisu uprawnień */}
      <Button
        type="button"
        variant="brand"
        isBusy={updatePermissionsMutation.isPending}
        disabled={!isDirty || updatePermissionsMutation.isPending}
        className={manageGroupRolesSectionStyles.saveButton}
        onClick={onSave}
      >
        {t("manageGroupSheet.savePermissions")}
      </Button>
    </div>
  );
}

export default ManageGroupRolesSection;
