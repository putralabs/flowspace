<?php

namespace App\Support;

use App\Models\User;
use App\Models\Workspace;

class Membership
{
    /** Role of a user inside a workspace: owner/admin/member/guest or null when not a member at all. */
    public static function role(User $user, Workspace $workspace): ?string
    {
        $row = $user->workspaces()->where('workspaces.id', $workspace->id)->first();

        return $row?->pivot?->role;
    }

    public static function canView(User $user, Workspace $workspace): bool
    {
        return self::role($user, $workspace) !== null;
    }

    public static function isAdminArea(User $user, Workspace $workspace): bool
    {
        return in_array(self::role($user, $workspace), ['owner', 'admin'], true);
    }
}
