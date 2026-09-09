<?php

namespace App\Policies;

use App\Models\Task;
use App\Models\User;
use App\Support\Membership;

class TaskPolicy
{
    public function view(User $user, Task $task): bool
    {
        return $user->can('view', $task->project);
    }

    public function create(User $user, Task $task): bool
    {
        if (! $user->can('view', $task->project)) {
            return false;
        }

        // Guests may only comment, not create tasks.
        return Membership::role($user, $task->project->workspace) !== 'guest';
    }

    public function update(User $user, Task $task): bool
    {
        if (! $this->create($user, $task)) {
            return false;
        }

        return true;
    }

    public function delete(User $user, Task $task): bool
    {
        if (Membership::isAdminArea($user, $task->project->workspace)) {
            return true;
        }

        return (int) $task->creator_id === (int) $user->id;
    }
}
