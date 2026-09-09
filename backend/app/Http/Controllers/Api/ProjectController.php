<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Project\AddProjectMemberRequest;
use App\Http\Requests\Project\StoreProjectRequest;
use App\Http\Requests\Project\UpdateProjectRequest;
use App\Models\Activity;
use App\Models\Project;
use App\Models\Workspace;
use App\Support\Membership;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    public function index(Request $request, Workspace $workspace): JsonResponse
    {
        if (! Membership::canView($request->user(), $workspace)) {
            return response()->json(['message' => 'Kamu bukan anggota workspace ini.'], 403);
        }

        $projects = $workspace->projects()
            ->withCount('tasks')
            ->get()
            ->each(function (Project $p) use ($request) {
                $p->my_role = Membership::role($request->user(), $p->workspace);
            });

        return response()->json($projects);
    }

    public function store(StoreProjectRequest $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validated();
        $validated['slug'] = Project::uniqueSlug($validated['name']);

        $project = Project::create(
            $validated + ['workspace_id' => $workspace->id, 'created_by' => $request->user()->id]
        );

        $project->members()->attach($request->user()->id, ['role' => 'admin']);

        Activity::create([
            'workspace_id' => $workspace->id,
            'actor_id' => $request->user()->id,
            'action' => 'created project',
            'target' => $project->name,
            'subject_type' => Project::class,
            'subject_id' => $project->id,
        ]);

        return response()->json($project, 201);
    }

    public function show(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        // Assignee dropdown (and avatar group) must list every workspace
        // member. Project-only membership stays nearly empty because there
        // is no UI managing it, so it would hide most teammates.
        $members = $project->workspace->members()
            ->orderBy('workspace_members.created_at')
            ->orderBy('users.id')
            ->get(['users.id', 'name', 'avatar_url']);

        return response()->json([
            'project' => $project,
            'my_role' => Membership::role($request->user(), $project->workspace),
            'members' => $members,
        ]);
    }

    public function update(UpdateProjectRequest $request, Project $project): JsonResponse
    {
        $project->update($request->validated());

        return response()->json($project);
    }

    public function destroy(Project $project): JsonResponse
    {
        $this->authorize('manage', $project);
        $project->delete();

        return response()->json(['message' => 'Proyek dihapus.']);
    }

    public function addMember(AddProjectMemberRequest $request, Project $project): JsonResponse
    {
        $data = $request->validated();

        $project->members()->syncWithoutDetaching([
            $data['user_id'] => ['role' => $data['role'] ?? 'member'],
        ]);

        return response()->json(['message' => 'Anggota proyek ditambahkan.']);
    }

    public function removeMember(Request $request, Project $project, int $memberId): JsonResponse
    {
        $this->authorize('manage', $project);
        $project->members()->detach($memberId);

        return response()->json(['message' => 'Anggota proyek dihapus.']);
    }
}
