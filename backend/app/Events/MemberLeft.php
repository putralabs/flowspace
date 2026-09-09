<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;

class MemberLeft implements ShouldBroadcast
{
    public $afterCommit = true;

    public function __construct(
        public int $workspaceId,
        public array $payload
    ) {
    }

    /** @return array<int, Channel> */
    public function broadcastOn(): array
    {
        return [new Channel("private-workspace.{$this->workspaceId}")];
    }


    /** @return array<string, mixed> */
    public function broadcastWith(): array
    {
        return $this->payload;
    }

    public function broadcastAs(): string
    {
        return class_basename(static::class);
    }
}
