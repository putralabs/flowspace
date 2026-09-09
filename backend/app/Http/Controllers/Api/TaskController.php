<?php

namespace App\Http\Controllers\Api;

use App\Events\TaskAssigned;
use App\Events\TaskCreated;
use App\Events\TaskDeleted;
use App\Events\TaskMoved;
use App\Events\TaskUpdated;
use App\Http\Controllers\Controller;
use App\Http\Requests\Task\MoveTaskRequest;
use App\Http\Requests\Task\StoreTaskRequest;
use App\Http\Requests\Task\UpdateTaskRequest;
use App\Models\Activity;
use App\Models\Project;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    public function index(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $tasks = $project->tasks()
            ->with('labels:id,workspace_id,name,color', 'assignee:id,name,avatar_url')
            ->when($request->query('status'), fn ($q, $v) => $q->where('status', $v))
            ->when($request->query('assignee_id'), fn ($q, $v) => $q->where('assignee_id', $v))
            ->orderBy('position')
            ->get();

        return response()->json($tasks);
    }

    public function store(StoreTaskRequest $request, Project $project): JsonResponse
    {
        $data = $request->validated();

        $status = $data['status'] ?? 'backlog';

        /** @var Task $task */
        $task = $project->tasks()->make(collect($data)->except('label_ids')->all());
        $task->creator_id = $request->user()->id;
        $task->status = $status;
        $task->priority = $data['priority'] ?? 'none';
        $task->position = ((int) $project->tasks()->where('status', $status)->max('position')) + 1;
        $task->save();

        if (! empty($data['label_ids'])) {
            $task->labels()->sync($data['label_ids']);
        }

        Activity::log($project, $request->user(), 'created', $task->title, $task);
        broadcast(new TaskCreated($task->load('labels')))->toOthers();

        if (! empty($task->assignee_id)) {
            broadcast(new TaskAssigned($task))->toOthers();
        }

        return response()->json($task->load('labels'), 201);
    }

    public function show(Request $request, Task $task): JsonResponse
    {
        $this->authorize('view', $task);

        return response()->json(
            $task->load(['labels', 'assignee:id,name,email,avatar_url', 'creator:id,name,avatar_url'])
                ->load('comments.user:id,name,avatar_url', 'comments.reactions')
                ->load('attachments.user:id,name,avatar_url')
        );
    }

    public function update(UpdateTaskRequest $request, Task $task): JsonResponse
    {
        $data = collect($request->validated())->except('label_ids')->all();

        $originalStatus = $task->status;
        $wasAssignedTo = $task->assignee_id;

        $task->update($data);

        if ($request->has('label_ids')) {
            $task->labels()->sync($request->validated('label_ids') ?? []);
        }

        if (isset($data['assignee_id']) && $data['assignee_id'] && (int) $data['assignee_id'] !== (int) $wasAssignedTo) {
            Activity::log($task->project, $request->user(), 'assigned task to', optional(\App\Models\User::find($data['assignee_id']))->name ?? 'someone', $task);
            broadcast(new TaskAssigned($task->load('labels')))->toOthers();
        } elseif ($originalStatus !== $task->status) {
            Activity::log($task->project, $request->user(), 'changed status to '.str($task->status)->replace('_', ' '), $task->title, $task);
            broadcast(new TaskMoved($task->load('labels')))->toOthers();
        } else {
            Activity::log($task->project, $request->user(), 'updated', $task->title, $task);
            broadcast(new TaskUpdated($task->load('labels')))->toOthers();
        }

        return response()->json($task->load('labels'));
    }

    public function move(MoveTaskRequest $request, Task $task): JsonResponse
    {
        $data = $request->validated();

        $originalStatus = $task->status;

        // Shift siblings in the target column to make room at the requested position.
        Task::where('project_id', $task->project_id)
            ->where('status', $data['status'])
            ->where('id', '!=', $task->id)
            ->where('position', '>=', $data['position'])
            ->when($originalStatus === $data['status'], fn ($q) => $q->where('position', '<', $task->position))
            ->increment('position');

        $task->update($data);

        if ($originalStatus !== $task->status) {
            Activity::log($task->project, $request->user(), 'moved task to '.str($data['status'])->replace('_', ' '), $task->title, $task);
            broadcast(new TaskMoved($task))->toOthers();
        } else {
            broadcast(new TaskUpdated($task))->toOthers();
        }

        return response()->json($task);
    }

    public function destroy(Request $request, Task $task): JsonResponse
    {
        $this->authorize('delete', $task);

        $task->delete();

        Activity::log($task->project, $request->user(), 'deleted', $task->title, null);
        broadcast(new TaskDeleted($task))->toOthers();

        return response()->json(status: 204);
    }
}
