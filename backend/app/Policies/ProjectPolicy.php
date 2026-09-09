<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\User;
use App\Support\Membership;

class ProjectPolicy
{
    public function view(User $user, Project $project): bool
    {
        if (! Membership::canView($user, $project->workspace)) {
            return false;
        }

        // Guests need an explicit project membership.
        if (Membership::role($user, $project->workspace) === 'guest') {
            return $project->members()->where('users.id', $user->id)->exists();
        }

        return true;
    }

    public function manage(User $user, Project $project): bool
    {
        if (Membership::isAdminArea($user, $project->workspace)) {
            return true;
        }

        return (bool) $project->members()
            ->where('users.id', $user->id)
            ->wherePivot('role', 'admin')
            ->exists();
    }
}
