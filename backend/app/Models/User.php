<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $fillable = ['name', 'email', 'password', 'last_seen_at', 'job_title', 'avatar_url'];

    protected function avatarUrl(): \Illuminate\Database\Eloquent\Casts\Attribute
    {
        return \Illuminate\Database\Eloquent\Casts\Attribute::make(
            get: fn ($value) => $value
                ? (str_starts_with($value, 'http') ? $value : \Illuminate\Support\Facades\Storage::disk('public')->url($value))
                : null,
        );
    }

    protected $hidden = ['password', 'remember_token', 'notifications', 'last_seen_at'];

    protected $casts = ['email_verified_at' => 'datetime', 'password' => 'hashed'];

    public function workspaces()
    {
        return $this->belongsToMany(Workspace::class, 'workspace_members')
            ->withPivot('role')
            ->withTimestamps();
    }

    /** Custom in-app notifications (overrides the Laravel Notifiable default). */
    public function notifications()
    {
        return $this->hasMany(Notification::class);
    }

    public function assignedTasks()
    {
        return $this->hasMany(Task::class, 'assignee_id');
    }
}
