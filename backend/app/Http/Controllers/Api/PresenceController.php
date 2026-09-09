<?php

namespace App\Http\Controllers\Api;

use App\Events\MemberOnline;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PresenceController extends Controller
{
    private const OFFLINE_AFTER_MINUTES = 2;

    public function heartbeat(Request $request): JsonResponse
    {
        $user = $request->user();
        $wasOffline = $user->last_seen_at === null
            || $user->last_seen_at->lt(now()->subMinutes(self::OFFLINE_AFTER_MINUTES));

        $user->update(['last_seen_at' => now()]);

        if ($wasOffline) {
            foreach ($user->workspaces()->pluck('workspaces.id') as $workspaceId) {
                broadcast(new MemberOnline($workspaceId, [
                    'user' => ['id' => $user->id, 'name' => $user->name],
                ]))->toOthers();
            }
        }

        return response()->json(['ok' => true], 204);
    }
}
