<?php

namespace App\Events;

use App\Models\Task;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

abstract class ProjectEvent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $afterCommit = true;

    public function __construct(public Task $task)
    {
    }

    /** @return array<int, Channel> */
    public function broadcastOn(): array
    {
        return [new Channel("private-project.{$this->task->project_id}")];
    }

    public function broadcastAs(): string
    {
        return class_basename(static::class);
    }

    /** @return array<string, mixed> */
    public function broadcastWith(): array
    {
        return ['task' => $this->task->only($this->fields()), 'project_id' => $this->task->project_id];
    }

    /** @return list<string> */
    protected function fields(): array
    {
        return ['id', 'title', 'status', 'priority', 'assignee_id', 'position', 'due_date', 'updated_at'];
    }
}
