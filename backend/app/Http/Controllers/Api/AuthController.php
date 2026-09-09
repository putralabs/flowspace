<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\Invitation;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Laravel\Socialite\Facades\Socialite;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create($request->safe()->except(['invitation_token']));

        if ($token = $request->validated('invitation_token')) {
            $this->applyInvitation($user, $token);
        }

        return response()->json([
            'user' => $user,
            'token' => $user->createToken('spa')->plainTextToken,
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->validated('email'))->first();

        if (! $user || ! Hash::check($request->validated('password'), $user->password)) {
            return response()->json([
                'message' => 'Email atau password salah. Coba lagi.',
            ], 422);
        }

        return response()->json([
            'user' => $user,
            'token' => $user->createToken('spa')->plainTextToken,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out.']);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email,'.$request->user()->id],
            'job_title' => ['nullable', 'string', 'max:255'],
        ]);

        $request->user()->update($data);

        return response()->json(['user' => $request->user()->fresh()]);
    }

    public function updateProfilePicture(Request $request): JsonResponse
    {
        $request->validate([
            'avatar' => ['required', 'image', 'max:2048', 'mimes:png,jpg,jpeg'],
        ]);

        $user = $request->user();

        $old = $user->getRawOriginal('avatar_url');
        if ($old) {
            \Illuminate\Support\Facades\Storage::disk('public')->delete($old);
        }

        $path = $request->file('avatar')->store('avatars', 'public');

        // Bypass the avatar_url accessor when persisting the raw path.
        $user->forceFill(['avatar_url' => $path])->save();

        return response()->json(['user' => $user->fresh()]);
    }

    public function removeProfilePicture(Request $request): JsonResponse
    {
        $user = $request->user();

        $old = $user->getRawOriginal('avatar_url');
        if ($old) {
            \Illuminate\Support\Facades\Storage::disk('public')->delete($old);
        }

        $user->forceFill(['avatar_url' => null])->save();

        return response()->json(['user' => $user->fresh()]);
    }

    public function updatePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'current_password:sanctum'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $request->user()->update(['password' => $data['password']]);

        return response()->json(['message' => 'Password updated.']);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'user' => $user,
            'workspaces' => $user->workspaces()->get(['workspaces.id', 'name'])->makeHidden('pivot'),
        ]);
    }

    public function redirectToGoogle(): JsonResponse
    {
        return response()->json([
            'url' => Socialite::driver('google')->stateless()->redirect()->getTargetUrl(),
        ]);
    }

    public function googleCallback(): \Illuminate\Http\RedirectResponse
    {
        try {
            $googleUser = Socialite::driver('google')->stateless()->user();
        } catch (\Throwable $e) {
            Log::warning('Google OAuth callback failed: '.$e->getMessage());

            return redirect(config('app.frontend_url').'/auth/login?error=google');
        }

        $user = User::firstOrCreate(
            ['email' => $googleUser->getEmail()],
            [
                'name' => $googleUser->getName() ?: ($googleUser->getNickname() ?: 'Pengguna Google'),
                'password' => Hash::make(\Illuminate\Support\Str::random(32)),
            ],
        );

        $token = $user->createToken('spa')->plainTextToken;

        return redirect(config('app.frontend_url').'/auth/callback/google?token='.$token);
    }

    private function applyInvitation(User $user, string $token): void
    {
        $invitation = Invitation::query()
            ->where('token', $token)
            ->whereNull('accepted_at')
            ->with('workspace')
            ->first();

        if (! $invitation || strtolower($invitation->email) !== strtolower($user->email)) {
            return;
        }

        if (! $invitation->workspace->members()->where('users.id', $user->id)->exists()) {
            $invitation->workspace->members()->attach($user->id, ['role' => $invitation->role]);
        }

        $invitation->update(['accepted_at' => now()]);
    }
}
