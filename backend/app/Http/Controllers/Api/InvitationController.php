<?php

namespace App\Http\Controllers\Api;

use App\Events\NotificationCreated;
use App\Http\Controllers\Controller;
use App\Models\Invitation;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InvitationController extends Controller
{
    /** Pending invitations addressed to the current user. */
    public function mine(Request $request): JsonResponse
    {
        $invitations = Invitation::query()
            ->where('email', $request->user()->email)
            ->whereNull('accepted_at')
            ->with(['workspace:id,name', 'inviter:id,name,avatar_url'])
            ->latest()
            ->get();

        $this->attachInviteeAvatars($invitations);

        return response()->json($invitations);
    }

    /** Pending invitations for a workspace (managers only). */
    public function forWorkspace(Request $request, Workspace $workspace): JsonResponse
    {
        abort_unless($request->user()->can('manage', $workspace), 403, 'Hanya owner atau admin yang dapat melihat undangan.');

        $invitations = $workspace->invitations()
            ->whereNull('accepted_at')
            ->with('inviter:id,name,avatar_url')
            ->latest()
            ->get();

        $this->attachInviteeAvatars($invitations);

        return response()->json($invitations);
    }

    /**
     * Attach the invited registered user's profile (photo) when known, so
     * pending rows can render a real avatar instead of initials.
     */
    private function attachInviteeAvatars($invitations): void
    {
        if ($invitations->isEmpty()) {
            return;
        }

        $byEmail = User::whereIn('email', $invitations->pluck('email')->all())
            ->get(['id', 'name', 'email', 'avatar_url'])
            ->keyBy(fn ($u) => strtolower($u->email));

        foreach ($invitations as $invitation) {
            $user = $byEmail->get(strtolower($invitation->email));
            $invitation->setAttribute('invitee', $user ? $user->only(['id', 'name', 'avatar_url']) : null);
        }
    }

    public function show(string $token): JsonResponse
    {
        $invitation = Invitation::query()
            ->where('token', $token)
            ->whereNull('accepted_at')
            ->with('workspace:id,name')
            ->first();

        abort_unless((bool) $invitation, 404, 'Undangan tidak ditemukan atau sudah digunakan.');

        return response()->json([
            'email' => $invitation->email,
            'role' => $invitation->role,
            'workspace' => $invitation->workspace->only(['id', 'name']),
        ]);
    }

    public function accept(Request $request, string $token): JsonResponse
    {
        $invitation = Invitation::query()
            ->where('token', $token)
            ->whereNull('accepted_at')
            ->with('workspace')
            ->first();

        abort_unless((bool) $invitation, 404, 'Undangan tidak ditemukan atau sudah digunakan.');
        abort_if(
            strtolower($invitation->email) !== strtolower($request->user()->email),
            403,
            'Undangan ini bukan untuk email kamu.',
        );

        if (! $invitation->workspace->members()->where('users.id', $request->user()->id)->exists()) {
            $invitation->workspace->members()->attach($request->user()->id, ['role' => $invitation->role]);
        }

        $invitation->update(['accepted_at' => now()]);

        $this->notifyInviter($invitation, "menerima undangan ke {$invitation->workspace->name}");

        return response()->json([
            'message' => "Kamu sekarang anggota {$invitation->workspace->name}.",
            'workspace' => $invitation->workspace->only(['id', 'name']),
        ]);
    }

    public function decline(Request $request, string $token): JsonResponse
    {
        $invitation = Invitation::query()
            ->where('token', $token)
            ->whereNull('accepted_at')
            ->with('workspace')
            ->first();

        abort_unless((bool) $invitation, 404, 'Undangan tidak ditemukan atau sudah digunakan.');
        abort_if(
            strtolower($invitation->email) !== strtolower($request->user()->email),
            403,
            'Undangan ini bukan untuk email kamu.',
        );

        $this->notifyInviter($invitation, "menolak undangan ke {$invitation->workspace->name}");

        $invitation->delete();

        return response()->json(['message' => 'Undangan ditolak.']);
    }

    /** Revoke a pending invitation (managers only). The row disappears from every list. */
    public function destroy(Request $request, Workspace $workspace, Invitation $invitation): JsonResponse
    {
        abort_unless($request->user()->can('manage', $workspace), 403, 'Hanya owner atau admin yang dapat membatalkan undangan.');
        abort_if((int) $invitation->workspace_id !== (int) $workspace->id, 404);
        abort_if($invitation->accepted_at !== null, 422, 'Undangan ini sudah diterima.');

        $invitation->delete();

        return response()->json(['message' => 'Undangan dibatalkan.']);
    }

    private function notifyInviter(Invitation $invitation, string $action): void
    {
        $inviterId = (int) $invitation->invited_by;

        if (! $inviterId) {
            return;
        }

        $me = auth()->user();

        if ($me && (int) $me->id === $inviterId) {
            return;
        }

        $notification = \App\Models\Notification::create([
            'user_id' => $inviterId,
            'workspace_id' => $invitation->workspace_id,
            'actor_id' => $me?->id,
            'type' => 'invitation',
            'body' => "{$me?->name} {$action}",
            'link' => "/workspaces/{$invitation->workspace_id}",
        ]);

        broadcast(new NotificationCreated($inviterId, [
            'body' => $notification->body,
            'link' => $notification->link,
        ]));
    }
}
