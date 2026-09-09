<?php

namespace App\Http\Controllers\Api;

use App\Events\AttachmentCreated;
use App\Events\AttachmentDeleted;
use App\Http\Controllers\Controller;
use App\Models\Attachment;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AttachmentController extends Controller
{
    private const MAX_KB = 10240;

    public function index(Request $request, Task $task): JsonResponse
    {
        $this->authorize('view', $task);

        return response()->json(
            $task->attachments()->with('user:id,name')->latest()->get(),
        );
    }

    public function store(Request $request, Task $task): JsonResponse
    {
        $this->authorize('view', $task);

        $data = $request->validate([
            'file' => [
                'required',
                'file',
                'mimes:png,jpg,jpeg,webp,pdf,docx,xlsx,zip',
                'max:'.self::MAX_KB,
            ],
        ]);

        /** @var \Illuminate\Http\UploadedFile $file */
        $file = $data['file'];

        $attachment = Attachment::create([
            'task_id' => $task->id,
            'user_id' => $request->user()->id,
            'filename' => $file->getClientOriginalName(),
            'path' => $file->store('attachments', 'local'),
            'mime' => $file->getClientMimeType(),
            'size' => $file->getSize(),
        ]);

        broadcast(new AttachmentCreated($task->project_id, $task->id))->toOthers();

        return response()->json($attachment->load('user:id,name'), 201);
    }

    public function download(Request $request, Attachment $attachment): StreamedResponse
    {
        $this->authorize('view', $attachment->task);

        abort_if(! Storage::disk('local')->exists($attachment->path), 404, 'File tidak ditemukan.');

        return Storage::disk('local')->download($attachment->path, $attachment->filename);
    }

    public function destroy(Request $request, Attachment $attachment): JsonResponse
    {
        $isUploader = (int) $attachment->user_id === (int) $request->user()->id;
        $canManage = $request->user()->can('manage', $attachment->task->project) ||
            \App\Support\Membership::role($request->user(), $attachment->task->project->workspace) === 'owner';

        abort_unless($isUploader || $canManage, 403, 'Kamu hanya dapat menghapus lampiran sendiri.');

        $projectId = $attachment->task->project_id;
        $taskId = $attachment->task_id;

        Storage::disk('local')->delete($attachment->path);
        $attachment->delete();

        broadcast(new AttachmentDeleted($projectId, $taskId))->toOthers();

        return response()->json(status: 204);
    }
}
