<?php

namespace App\Http\Requests\Workspace;

use Illuminate\Foundation\Http\FormRequest;

class UpdateMemberRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manage', $this->route('workspace'));
    }

    /** @return array<string, array<mixed>> */
    public function rules(): array
    {
        return [
            'role' => ['required', 'in:admin,member,guest'],
        ];
    }
}
