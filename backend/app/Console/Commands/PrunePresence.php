<?php

namespace App\Console\Commands;

use App\Events\MemberOffline;
use App\Models\User;
use Illuminate\Console\Command;

class PrunePresence extends Command
{
    protected $signature = 'flowspace:prune-presence';

    protected $description = 'Broadcast MemberOffline and clear last_seen_at for stale users';

    public function handle(): int
    {
        $stale = User::query()
            ->whereNotNull('last_seen_at')
            ->where('last_seen_at', '<', now()->subMinutes(2))
            ->get();

        foreach ($stale as $user) {
            $workspaceIds = $user->workspaces()->pluck('workspaces.id');

            foreach ($workspaceIds as $workspaceId) {
                broadcast(new MemberOffline($workspaceId, [
                    'user' => ['id' => $user->id, 'name' => $user->name],
                ]))->toOthers();
            }

            $user->update(['last_seen_at' => null]);
        }

        $this->info("Pruned {$stale->count()} stale presence records.");

        return self::SUCCESS;
    }
}
