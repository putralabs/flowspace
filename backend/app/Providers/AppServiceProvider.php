<?php

namespace App\Providers;

use App\Models\Project;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('api', function (Request $request) {
            return $request->user()
                ? Limit::perMinute(120)->by($request->user()->id)
                : Limit::perMinute(60)->by($request->ip());
        });

        RateLimiter::for('auth', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip());
        });

        RateLimiter::for('typing', function (Request $request) {
            return $request->user()
                ? Limit::perMinute(90)->by($request->user()->id)
                : Limit::perMinute(30)->by($request->ip());
        });

        // Allow /projects/{project} to resolve by numeric ID (legacy) or slug (preferred).
        // Keeps old /projects/3/board links working while new URLs use /projects/nama-project/board.
        Route::bind('project', function ($value) {
            if (is_numeric($value)) {
                return Project::where('id', (int) $value)->firstOrFail();
            }

            return Project::where('slug', $value)->firstOrFail();
        });
    }
}
