<?php

use App\Models\Project;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

// NOTE: patterns are written WITHOUT the "private-" prefix - Laravel strips
// that prefix before matching against these registered patterns.
Broadcast::channel('project.{projectId}', function (User $user, int $projectId) {
    $project = Project::find($projectId);

    return $project ? $user->can('view', $project) : false;
});

Broadcast::channel('workspace.{workspaceId}.presence', function (User $user, int $workspaceId) {
    if (! $user->workspaces()->where('workspaces.id', $workspaceId)->exists()) {
        return null;
    }

    return ['id' => $user->id, 'name' => $user->name];
});

Broadcast::channel('workspace.{workspaceId}', function (User $user, int $workspaceId) {
    return $user->workspaces()->where('workspaces.id', $workspaceId)->exists();
});

Broadcast::channel('user.{userId}', fn (User $user, int $userId) => (int) $user->id === $userId);
