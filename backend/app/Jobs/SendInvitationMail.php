<?php

namespace App\Jobs;

use App\Mail\InvitationMail;
use App\Models\Invitation;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Mail;

class SendInvitationMail implements ShouldQueue
{
    use Queueable;

    public function __construct(public int $invitationId)
    {
    }

    public function handle(): void
    {
        $invitation = Invitation::query()
            ->with('workspace:id,name')
            ->find($this->invitationId);

        if (! $invitation || $invitation->accepted_at !== null) {
            return;
        }

        Mail::to($invitation->email)->send(new InvitationMail($invitation));
    }
}
