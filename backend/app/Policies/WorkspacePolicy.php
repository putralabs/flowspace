<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Workspace;
use App\Support\Membership;

class WorkspacePolicy
{
    public function view(User $user, Workspace $workspace): bool
    {
        return Membership::canView($user, $workspace);
    }

    public function manage(User $user, Workspace $workspace): bool
    {
        return in_array(Membership::role($user, $workspace), ['owner', 'admin'], true);
    }

    public function delete(User $user, Workspace $workspace): bool
    {
        return Membership::role($user, $workspace) === 'owner';
    }
}
