<?php

namespace App\Http\Requests\Workspace;

use Illuminate\Foundation\Http\FormRequest;

class InviteMemberRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manage', $this->route('workspace'));
    }

    /** @return array<string, array<mixed>> */
    public function rules(): array
    {
        return [
            'email' => ['required', 'email'],
            'role' => ['required', 'in:admin,member,guest'],
        ];
    }
}
