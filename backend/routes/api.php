<?php

use App\Http\Controllers\Api\ActivityController;
use App\Http\Controllers\Api\AttachmentController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CommentController;
use App\Http\Controllers\Api\InvitationController;
use App\Http\Controllers\Api\LabelController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PresenceController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\SearchController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\TypingController;
use App\Http\Controllers\Api\WorkspaceController;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;

// Channel authorization over the API stack so SPA Bearer tokens work.
Broadcast::routes(['middleware' => ['auth:sanctum']]);

Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register'])->middleware('throttle:auth');
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:auth');
    Route::get('google', [AuthController::class, 'redirectToGoogle']);
    Route::get('google/callback', [AuthController::class, 'googleCallback']);
    Route::post('logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
    Route::get('me', [AuthController::class, 'me'])->middleware('auth:sanctum');
    Route::put('profile', [AuthController::class, 'updateProfile'])->middleware('auth:sanctum');
    Route::post('profile/picture', [AuthController::class, 'updateProfilePicture'])->middleware('auth:sanctum');
    Route::delete('profile/picture', [AuthController::class, 'removeProfilePicture'])->middleware('auth:sanctum');
    Route::put('password', [AuthController::class, 'updatePassword'])->middleware('auth:sanctum');
});

// Own pending invitations (must be registered before the {token} wildcard).
Route::get('invitations/pending', [InvitationController::class, 'mine'])->middleware('auth:sanctum');

// Public invitation preview by token.
Route::get('invitations/{token}', [InvitationController::class, 'show']);

Route::get('search', [SearchController::class, 'index'])->middleware('auth:sanctum');

Route::middleware('auth:sanctum')->group(function () {
    // Workspaces
    Route::get('workspaces', [WorkspaceController::class, 'index']);
    Route::post('workspaces', [WorkspaceController::class, 'store']);
    Route::get('workspaces/{workspace}', [WorkspaceController::class, 'show']);
    Route::put('workspaces/{workspace}', [WorkspaceController::class, 'update']);
    Route::delete('workspaces/{workspace}', [WorkspaceController::class, 'destroy']);
    Route::post('workspaces/{workspace}/members', [WorkspaceController::class, 'inviteMember']);
    Route::put('workspaces/{workspace}/members/{member}/role', [WorkspaceController::class, 'updateMemberRole']);
    Route::delete('workspaces/{workspace}/members/{member}', [WorkspaceController::class, 'removeMember']);

    // Labels
    Route::get('workspaces/{workspace}/labels', [LabelController::class, 'index']);
    Route::post('workspaces/{workspace}/labels', [LabelController::class, 'store']);
    Route::put('labels/{label}', [LabelController::class, 'update']);
    Route::delete('labels/{label}', [LabelController::class, 'destroy']);

    // Projects
    Route::get('workspaces/{workspace}/projects', [ProjectController::class, 'index']);
    Route::post('workspaces/{workspace}/projects', [ProjectController::class, 'store']);
    Route::get('projects/{project}', [ProjectController::class, 'show']);
    Route::put('projects/{project}', [ProjectController::class, 'update']);
    Route::delete('projects/{project}', [ProjectController::class, 'destroy']);
    Route::post('projects/{project}/members', [ProjectController::class, 'addMember']);
    Route::delete('projects/{project}/members/{memberId}', [ProjectController::class, 'removeMember']);

    // Tasks
    Route::get('projects/{project}/tasks', [TaskController::class, 'index']);
    Route::post('projects/{project}/tasks', [TaskController::class, 'store']);
    Route::get('tasks/{task}', [TaskController::class, 'show']);
    Route::put('tasks/{task}', [TaskController::class, 'update']);
    Route::patch('tasks/{task}/move', [TaskController::class, 'move']);
    Route::delete('tasks/{task}', [TaskController::class, 'destroy']);

    // Comments
    Route::get('tasks/{task}/comments', [CommentController::class, 'index']);
    Route::post('tasks/{task}/comments', [CommentController::class, 'store']);
    Route::put('comments/{comment}', [CommentController::class, 'update']);
    Route::delete('comments/{comment}', [CommentController::class, 'destroy']);

    // Attachments
    Route::get('tasks/{task}/attachments', [AttachmentController::class, 'index']);
    Route::post('tasks/{task}/attachments', [AttachmentController::class, 'store']);
    Route::get('attachments/{attachment}/download', [AttachmentController::class, 'download']);
    Route::delete('attachments/{attachment}', [AttachmentController::class, 'destroy']);

    // Realtime typing indicator (debounce on the client)
    Route::post('projects/{project}/typing', [TypingController::class, 'start'])->middleware('throttle:typing');
    Route::post('projects/{project}/typing/stop', [TypingController::class, 'stop'])->middleware('throttle:typing');

    // Presence heartbeat
    Route::post('presence/heartbeat', [PresenceController::class, 'heartbeat']);

    // Activity feed
    Route::get('projects/{project}/activities', [ActivityController::class, 'index']);

    // Invitations
    Route::get('workspaces/{workspace}/invitations', [InvitationController::class, 'forWorkspace']);
    Route::delete('workspaces/{workspace}/invitations/{invitation}', [InvitationController::class, 'destroy']);
    Route::post('invitations/{token}/accept', [InvitationController::class, 'accept']);
    Route::post('invitations/{token}/decline', [InvitationController::class, 'decline']);

    // Notifications
    Route::get('notifications', [NotificationController::class, 'index']);
    Route::patch('notifications/{notification}/read', [NotificationController::class, 'markRead']);
    Route::post('notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::delete('notifications/{notification}', [NotificationController::class, 'destroy']);
});
