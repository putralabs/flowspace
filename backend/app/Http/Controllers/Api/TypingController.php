<?php

namespace App\Http\Controllers\Api;

use App\Events\TypingStarted;
use App\Events\TypingStopped;
use App\Http\Controllers\Controller;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TypingController extends Controller
{
    public function start(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        broadcast(new TypingStarted($project->id, [
            'user' => ['id' => $request->user()->id, 'name' => $request->user()->name],
            'task_id' => $request->integer('task_id') ?: null,
        ]))->toOthers();

        return response()->json(status: 204);
    }

    public function stop(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        broadcast(new TypingStopped($project->id, [
            'user' => ['id' => $request->user()->id],
            'task_id' => $request->integer('task_id') ?: null,
        ]))->toOthers();

        return response()->json(status: 204);
    }
}
