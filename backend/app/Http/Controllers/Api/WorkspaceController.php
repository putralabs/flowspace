<?php

namespace App\Http\Controllers\Api;

use App\Events\MemberJoined;
use App\Events\MemberLeft;
use App\Http\Controllers\Controller;
use App\Http\Requests\Workspace\InviteMemberRequest;
use App\Http\Requests\Workspace\StoreWorkspaceRequest;
use App\Http\Requests\Workspace\UpdateMemberRoleRequest;
use App\Http\Requests\Workspace\UpdateWorkspaceRequest;
use App\Models\Notification;
use App\Models\User;
use App\Models\Workspace;
use App\Support\Membership;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkspaceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $workspaces = $request->user()->workspaces()
            ->withCount(['projects', 'members'])
            ->get()
            ->map(function (Workspace $w) use ($request) {
                $w->my_role = Membership::role($request->user(), $w);

                return $w;
            });

        return response()->json($workspaces);
    }

    public function store(StoreWorkspaceRequest $request): JsonResponse
    {
        $workspace = Workspace::create($request->validated() + ['owner_id' => $request->user()->id]);
        $workspace->members()->attach($request->user()->id, ['role' => 'owner']);

        return response()->json($workspace, 201);
    }

    public function show(Request $request, Workspace $workspace): JsonResponse
    {
        $this->authorize('view', $workspace);

        return response()->json([
            'workspace' => $workspace,
            'my_role' => Membership::role($request->user(), $workspace),
            // Earliest joiners first (pivot created_at, user id as tiebreak).
            'members' => $workspace->members()
                ->orderBy('workspace_members.created_at')
                ->orderBy('users.id')
                ->get(['users.id', 'name', 'email'])->each(
                    fn ($m) => $m->role = $m->pivot->role
                ),
            'projects_count' => $workspace->projects()->count(),
        ]);
    }

    public function update(UpdateWorkspaceRequest $request, Workspace $workspace): JsonResponse
    {
        $workspace->update($request->validated());

        return response()->json($workspace);
    }

    public function destroy(Request $request, Workspace $workspace): JsonResponse
    {
        if (Membership::role($request->user(), $workspace) !== 'owner') {
            return response()->json(['message' => 'Hanya owner yang dapat menghapus workspace.'], 403);
        }

        $workspace->delete();

        return response()->json(['message' => 'Workspace dihapus.']);
    }

    public function inviteMember(InviteMemberRequest $request, Workspace $workspace): JsonResponse
    {
        $data = $request->validated();

        $invitee = User::where('email', $data['email'])->first();

        // Only registered users can be invited. There is no working email
        // delivery, so accepting an unknown email would show a false
        // "invitation sent" message that never reaches anyone.
        if (! $invitee) {
            return response()->json([
                'message' => "Email {$data['email']} belum terdaftar di Flowspace. Minta mereka membuat akun terlebih dahulu, lalu undang lagi.",
                'invited_existing' => false,
            ], 422);
        }

        if ($workspace->members()->where('users.id', $invitee->id)->exists()) {
            return response()->json([
                'message' => "{$invitee->name} sudah menjadi anggota workspace ini.",
                'invited_existing' => true,
            ]);
        }

        $pending = $workspace->invitations()
            ->where('email', $invitee->email)
            ->whereNull('accepted_at')
            ->first();

        if ($pending) {
            return response()->json([
                'message' => "Undangan untuk {$invitee->email} masih menunggu konfirmasi.",
                'invited_existing' => true,
                'pending' => true,
            ], 422);
        }

        // New invites stay pending until the invitee accepts. Nothing is
        // attached here; membership is granted in InvitationController@accept.
        $invitation = $workspace->invitations()->create([
            'email' => $invitee->email,
            'role' => $data['role'],
            'token' => \Illuminate\Support\Str::random(64),
            'invited_by' => $request->user()->id,
        ]);

        $notification = Notification::create([
            'user_id' => $invitee->id,
            'workspace_id' => $workspace->id,
            'actor_id' => $request->user()->id,
            'type' => 'invitation',
            'body' => "invited you to {$workspace->name} as {$data['role']}",
            'link' => "/invitations/{$invitation->token}",
        ]);

        broadcast(new \App\Events\NotificationCreated($invitee->id, [
            'body' => $notification->body,
            'link' => $notification->link,
        ]));

        return response()->json([
            'message' => "Undangan dikirim ke {$invitee->email}. Menunggu konfirmasi.",
            'invited_existing' => true,
            'pending' => true,
        ], 201);
    }

    public function updateMemberRole(UpdateMemberRoleRequest $request, Workspace $workspace, User $member): JsonResponse
    {
        if ((int) $member->id === (int) $workspace->owner_id) {
            return response()->json(['message' => 'Role owner tidak dapat diubah.'], 422);
        }

        $workspace->members()->updateExistingPivot($member->id, ['role' => $request->validated('role')]);

        return response()->json(['message' => 'Role diperbarui.']);
    }

    public function removeMember(Request $request, Workspace $workspace, User $member): JsonResponse
    {
        $this->authorize('manage', $workspace);

        if ((int) $member->id === (int) $workspace->owner_id) {
            return response()->json(['message' => 'Owner tidak dapat dikeluarkan dari workspace.'], 422);
        }

        $workspace->members()->detach($member->id);

        broadcast(new MemberLeft($workspace->id, [
            'user' => ['id' => $member->id, 'name' => $member->name],
        ]))->toOthers();

        return response()->json(['message' => 'Anggota dikeluarkan dari workspace.']);
    }
}
