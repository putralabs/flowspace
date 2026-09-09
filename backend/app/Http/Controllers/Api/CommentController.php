<?php

namespace App\Http\Controllers\Api;

use App\Events\CommentCreated;
use App\Events\CommentDeleted;
use App\Events\CommentUpdated;
use App\Events\NotificationCreated;
use App\Events\TypingStopped;
use App\Http\Controllers\Controller;
use App\Http\Requests\Comment\StoreCommentRequest;
use App\Http\Requests\Comment\UpdateCommentRequest;
use App\Models\Activity;
use App\Models\Comment;
use App\Models\Notification;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommentController extends Controller
{
    public function index(Request $request, Task $task): JsonResponse
    {
        $this->authorize('view', $task);

        return response()->json(
            $task->comments()
                ->with('user:id,name,email,avatar_url', 'reactions')
                ->orderBy('created_at')
                ->paginate(30)
        );
    }

    public function store(StoreCommentRequest $request, Task $task): JsonResponse
    {
        /** @var array{body: string, parent_id?: int|null} $data */
        $data = $request->validated();

        /** @var Comment $comment */
        $comment = $task->comments()->make([
            'body' => $data['body'],
            'parent_id' => $data['parent_id'] ?? null,
        ]);
        $comment->user_id = $request->user()->id;
        $comment->save();

        $this->notifyMentions($task, $comment, $request->user());

        Activity::log($task->project, $request->user(), 'commented on', $task->title, $task);

        broadcast(new CommentCreated($task->project_id, [
            'comment' => $comment->only(['id', 'task_id', 'user_id', 'parent_id', 'body']),
            'user' => ['id' => $request->user()->id, 'name' => $request->user()->name],
        ]))->toOthers();

        broadcast(new TypingStopped($task->project_id, [
            'user' => ['id' => $request->user()->id],
            'task_id' => $task->id,
        ]))->toOthers();

        return response()->json($comment->load('user:id,name,avatar_url'), 201);
    }

    public function update(UpdateCommentRequest $request, Comment $comment): JsonResponse
    {
        $comment->update($request->validated());

        broadcast(new CommentUpdated($comment->task->project_id, [
            'comment_id' => $comment->id,
            'task_id' => $comment->task_id,
            'body' => $comment->body,
        ]))->toOthers();

        return response()->json($comment);
    }

    public function destroy(Request $request, Comment $comment): JsonResponse
    {
        if ((int) $comment->user_id !== (int) $request->user()->id) {
            return response()->json(['message' => 'Kamu hanya dapat menghapus komentar sendiri.'], 403);
        }

        $projectId = $comment->task->project_id;
        $taskId = $comment->task_id;

        $comment->delete();

        broadcast(new CommentDeleted($projectId, [
            'comment_id' => $comment->id,
            'task_id' => $taskId,
        ]))->toOthers();

        return response()->json(status: 204);
    }

    private function notifyMentions(Task $task, Comment $comment, User $actor): void
    {
        preg_match_all('/@([\w\.\-]+)/u', $comment->body, $matches);

        $tokens = array_unique($matches[1]);
        if (empty($tokens)) {
            return;
        }

        $workspace = $task->project->workspace;
        $notified = [];

        foreach ($tokens as $namePart) {
            if (strtolower($namePart) === 'everyone') {
                // @everyone pings every workspace member except the author.
                // Guests cannot ping the whole workspace.
                if (\App\Support\Membership::role($actor, $workspace) === 'guest') {
                    continue;
                }
                $mentioned = User::whereHas('workspaces', fn ($w) => $w->where('workspaces.id', $workspace->id))->get();
            } else {
                // Only workspace members can be mentioned. Matching against every
                // user in the database spammed strangers with dead links.
                $mentioned = User::whereHas('workspaces', fn ($w) => $w->where('workspaces.id', $workspace->id))
                    ->where('name', 'like', $namePart.'%')
                    ->get();
            }

            foreach ($mentioned as $user) {
                if ((int) $user->id === (int) $actor->id || isset($notified[$user->id])) {
                    continue;
                }
                $notified[$user->id] = true;

                $projectSlug = $task->project->slug ?? $task->project_id;
                $notification = Notification::create([
                    'user_id' => $user->id,
                    'workspace_id' => $workspace->id,
                    'actor_id' => $actor->id,
                    'type' => 'mention',
                    'body' => "mentioned you in {$task->title}",
                    'link' => "/projects/{$projectSlug}/board",
                ]);
                broadcast(new NotificationCreated($user->id, [
                    'body' => $notification->body,
                    'link' => $notification->link,
                ]));
            }
        }
    }
}
