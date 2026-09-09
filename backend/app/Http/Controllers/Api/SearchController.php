<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SearchController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));

        if ($q === '') {
            return response()->json(['projects' => [], 'tasks' => [], 'members' => [], 'comments' => []]);
        }

        $like = "%{$q}%";

        $workspaceIds = $request->user()->workspaces()->pluck('workspaces.id');

        return response()->json([
            'projects' => Project::whereIn('workspace_id', $workspaceIds)
                ->where('name', 'like', $like)
                ->limit(8)
                ->get(['id', 'workspace_id', 'name', 'slug', 'color']),

            'tasks' => Task::whereHas('project', fn ($p) => $p->whereIn('workspace_id', $workspaceIds))
                ->where(fn ($t) => $t->where('title', 'like', $like)->orWhere('description', 'like', $like))
                ->with('project:id,slug,name')
                ->limit(10)
                ->get(['id', 'project_id', 'title', 'status', 'priority']),

            'members' => User::whereHas('workspaces', fn ($w) => $w->whereIn('workspaces.id', $workspaceIds))
                ->where(fn ($u) => $u->where('name', 'like', $like)->orWhere('email', 'like', $like))
                ->limit(6)
                ->get(['id', 'name', 'email', 'avatar_url']),

            'comments' => DB::table('comments')
                ->join('tasks', 'tasks.id', '=', 'comments.task_id')
                ->join('projects', 'projects.id', '=', 'tasks.project_id')
                ->whereIn('projects.workspace_id', $workspaceIds)
                ->where('comments.body', 'like', $like)
                ->limit(6)
                ->get(['comments.id', 'comments.body', 'tasks.title as task_title']),
        ]);
    }
}
