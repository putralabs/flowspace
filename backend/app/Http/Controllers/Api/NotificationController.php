<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $notifications = $request->user()
            ->notifications()
            ->with('actor:id,name,avatar_url')
            ->when($request->filled('workspace_id'), fn ($q) => $q->where(
                'workspace_id',
                (int) $request->query('workspace_id'),
            ))
            ->latest()
            ->paginate(20);

        return response()->json([
            'unread' => (clone $notifications)->getCollection()->whereNull('read_at')->count(),
            'items' => $notifications,
        ]);
    }

    public function markRead(Notification $notification): JsonResponse
    {
        if ((int) $notification->user_id !== auth()->id()) {
            return response()->json(['message' => 'Bukan notifikasi kamu.'], 403);
        }

        $notification->update(['read_at' => now()]);

        return response()->json($notification);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $request->user()
            ->notifications()
            ->when($request->filled('workspace_id'), fn ($q) => $q->where(
                'workspace_id',
                (int) $request->query('workspace_id'),
            ))
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['message' => 'Semua notifikasi ditandai terbaca.']);
    }

    public function destroy(Notification $notification): JsonResponse
    {
        if ((int) $notification->user_id !== auth()->id()) {
            return response()->json(['message' => 'Bukan notifikasi kamu.'], 403);
        }

        $notification->delete();

        return response()->json(status: 204);
    }
}
