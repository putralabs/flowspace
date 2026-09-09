<?php

use App\Models\Notification;
use App\Models\Project;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->foreignId('workspace_id')->nullable()->after('user_id')
                ->constrained('workspaces')->nullOnDelete();
            $table->index(['user_id', 'workspace_id']);
        });

        // Backfill: derive the workspace from the notification's link.
        Notification::query()->whereNull('workspace_id')->chunkById(100, function ($items) {
            foreach ($items as $notification) {
                if (preg_match('#^/projects/(\d+)#', (string) $notification->link, $m)) {
                    $project = Project::find($m[1]);
                    if ($project) {
                        $notification->update(['workspace_id' => $project->workspace_id]);
                    }
                } elseif (preg_match('#^/workspaces/(\d+)#', (string) $notification->link, $m)) {
                    $notification->update(['workspace_id' => (int) $m[1]]);
                }
            }
        });
    }

    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropConstrainedForeignId('workspace_id');
            $table->dropIndex(['user_id', 'workspace_id']);
        });
    }
};
