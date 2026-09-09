<?php

namespace Database\Seeders;

use App\Models\Activity;
use App\Models\Comment;
use App\Models\Label;
use App\Models\Notification;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $putra = User::create(['name' => 'Putra', 'email' => 'putra@flowspace.app', 'password' => 'password123']);
        $andi = User::create(['name' => 'Andi', 'email' => 'andi@flowspace.app', 'password' => 'password123']);
        $budi = User::create(['name' => 'Budi', 'email' => 'budi@flowspace.app', 'password' => 'password123']);
        $sari = User::create(['name' => 'Sari', 'email' => 'sari@flowspace.app', 'password' => 'password123']);

        $ws = Workspace::create([
            'name' => 'Development Team',
            'description' => 'Product engineering and internal tools.',
            'owner_id' => $putra->id,
        ]);

        collect([
            [$putra, 'owner'], [$andi, 'admin'], [$budi, 'member'], [$sari, 'member'],
        ])->each(fn ($pair) => $ws->members()->attach($pair[0]->id, ['role' => $pair[1]]));

        collect([
            ['Design', '#8b5cf6'], ['Frontend', '#3f6fa8'], ['Backend', '#2f7d5a'],
            ['Bug', '#b94a48'], ['Research', '#a66a1f'],
        ])->each(fn ($l) => Label::create(['workspace_id' => $ws->id, 'name' => $l[0], 'color' => $l[1]]));

        $labels = Label::pluck('id', 'name');

        $website = Project::create([
            'workspace_id' => $ws->id,
            'created_by' => $putra->id,
            'name' => 'Website Redesign',
            'description' => 'Redesign company website and improve the overall user experience.',
            'color' => '#4f46e5',
            'status' => 'active',
            'start_date' => '2026-07-01',
            'due_date' => '2026-09-15',
        ]);
        $website->members()->attach([$putra->id, $andi->id, $budi->id]);

        $mobile = Project::create([
            'workspace_id' => $ws->id,
            'created_by' => $putra->id,
            'name' => 'Mobile App',
            'description' => 'Cross-platform mobile client for Flowspace.',
            'color' => '#2f7d5a',
            'status' => 'active',
            'start_date' => '2026-07-20',
            'due_date' => '2026-10-30',
        ]);
        $mobile->members()->attach([$putra->id, $budi->id, $sari->id]);

        $marketing = Project::create([
            'workspace_id' => $ws->id,
            'created_by' => $andi->id,
            'name' => 'Marketing Site',
            'description' => 'Landing pages and campaign infrastructure.',
            'color' => '#a66a1f',
            'status' => 'planned',
            'start_date' => '2026-08-18',
            'due_date' => '2026-11-05',
        ]);
        $marketing->members()->attach([$andi->id, $sari->id]);

        $makeTask = function (Project $project, array $row) use ($putra) {
            return Task::create([
                'project_id' => $project->id,
                'creator_id' => $putra->id,
                'assignee_id' => $row['assignee'] ?? null,
                'title' => $row['title'],
                'description' => 'Break the work into small, verifiable steps. Coordinate with the team before changing shared interfaces.',
                'status' => $row['status'],
                'priority' => $row['priority'] ?? 'none',
                'due_date' => $row['due'] ?? null,
                'position' => $row['position'],
            ]);
        };

        $authTask = $makeTask($website, ['title' => 'Authentication flow', 'status' => 'in_progress', 'priority' => 'urgent', 'assignee' => $andi->id, 'due' => '2026-08-23', 'position' => 0]);
        $makeTask($website, ['title' => 'Improve login experience', 'status' => 'in_progress', 'priority' => 'high', 'assignee' => $putra->id, 'due' => '2026-08-24', 'position' => 1]);
        $makeTask($website, ['title' => 'Navigation IA restructure', 'status' => 'review', 'priority' => 'high', 'assignee' => $andi->id, 'due' => '2026-08-25', 'position' => 0]);
        $makeTask($website, ['title' => 'Hero section concepts', 'status' => 'todo', 'priority' => 'medium', 'assignee' => $putra->id, 'due' => '2026-08-29', 'position' => 0]);
        $makeTask($website, ['title' => 'Contact form validation', 'status' => 'todo', 'priority' => 'medium', 'position' => 1]);
        $makeTask($website, ['title' => 'Accessibility audit', 'status' => 'backlog', 'priority' => 'high', 'due' => '2026-09-08', 'position' => 0]);
        $designAudit = $makeTask($website, ['title' => 'Design tokens audit', 'status' => 'done', 'priority' => 'medium', 'assignee' => $putra->id, 'position' => 0]);

        Comment::create(['task_id' => $authTask->id, 'user_id' => $putra->id, 'body' => '@Andi authentication flow masih perlu dicek untuk mobile.']);
        Comment::create(['task_id' => $authTask->id, 'user_id' => $andi->id, 'body' => 'Sudah saya update. Tolong review bagian session handling.']);

        $makeTask($mobile, ['title' => 'Login screen', 'status' => 'in_progress', 'priority' => 'high', 'assignee' => $budi->id, 'due' => '2026-08-26', 'position' => 0]);
        $makeTask($mobile, ['title' => 'Onboarding flow', 'status' => 'review', 'priority' => 'medium', 'assignee' => $budi->id, 'position' => 0]);
        $makeTask($mobile, ['title' => 'Offline caching strategy', 'status' => 'backlog', 'priority' => 'high', 'position' => 0]);
        $makeTask($mobile, ['title' => 'Crash reporting integration', 'status' => 'done', 'priority' => 'low', 'assignee' => $putra->id, 'position' => 0]);

        $makeTask($marketing, ['title' => 'Content calendar Q4', 'status' => 'todo', 'priority' => 'medium', 'assignee' => $sari->id, 'due' => '2026-09-02', 'position' => 0]);
        $makeTask($marketing, ['title' => 'Brand asset refresh', 'status' => 'backlog', 'priority' => 'low', 'assignee' => $andi->id, 'position' => 0]);

        // Attach a couple of labels
        $authTask->labels()->sync([$labels['Backend']]);
        $designAudit->labels()->sync([$labels['Design'], $labels['Frontend']]);

        Notification::create(['user_id' => $putra->id, 'actor_id' => $andi->id, 'type' => 'mention', 'body' => 'mentioned you in Authentication flow', 'link' => "/projects/{$website->id}/board"]);
        Notification::create(['user_id' => $putra->id, 'actor_id' => $budi->id, 'type' => 'comment', 'body' => 'replied to your comment in Onboarding flow', 'link' => "/projects/{$mobile->id}/board"]);
        Notification::create(['user_id' => $putra->id, 'actor_id' => $andi->id, 'type' => 'assigned', 'body' => 'assigned you to Navigation IA restructure', 'link' => "/projects/{$website->id}/board"]);

        Activity::create(['workspace_id' => $ws->id, 'actor_id' => $budi->id, 'action' => 'moved task to review', 'target' => 'Login screen']);
        Activity::create(['workspace_id' => $ws->id, 'actor_id' => $andi->id, 'action' => 'commented on', 'target' => 'Authentication flow']);
        Activity::create(['workspace_id' => $ws->id, 'actor_id' => $putra->id, 'action' => 'created project', 'target' => 'Website Redesign']);
    }
}
