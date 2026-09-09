<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AttachmentDeleted implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $afterCommit = true;

    public function __construct(public int $projectId, public int $taskId) {}

    /** @return array<int, Channel> */
    public function broadcastOn(): array
    {
        return [new Channel("private-project.{$this->projectId}")];
    }

    public function broadcastAs(): string
    {
        return 'AttachmentDeleted';
    }

    /** @return array<string, mixed> */
    public function broadcastWith(): array
    {
        return ['task_id' => $this->taskId, 'project_id' => $this->projectId];
    }
}
