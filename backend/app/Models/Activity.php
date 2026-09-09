<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;class Activity extends Model
{
    public $timestamps = false;

    protected $fillable = ['workspace_id', 'actor_id', 'action', 'target', 'subject_type', 'subject_id'];

    protected $casts = ['created_at' => 'datetime'];

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    public function subject(): MorphTo
    {
        return $this->morphTo();
    }

    public static function log(Project $project, User $actor, string $action, ?string $target, ?Model $subject = null): self
    {
        return static::create([
            'workspace_id' => $project->workspace_id,
            'actor_id' => $actor->id,
            'action' => $action,
            'target' => $target,
            'subject_type' => $subject?->getMorphClass(),
            'subject_id' => $subject?->getKey(),
        ]);
    }
}
