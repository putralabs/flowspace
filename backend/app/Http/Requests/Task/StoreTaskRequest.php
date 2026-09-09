<?php

namespace App\Http\Requests\Task;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        $project = $this->route('project');

        return $this->user()->can('create', new \App\Models\Task(['project_id' => $project->id]));
    }

    /** @return array<string, array<mixed>> */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['nullable', Rule::in(['backlog', 'todo', 'in_progress', 'review', 'done'])],
            'priority' => ['nullable', Rule::in(['none', 'low', 'medium', 'high', 'urgent'])],
            'assignee_id' => ['nullable', 'exists:users,id'],
            'due_date' => ['nullable', 'date'],
            'label_ids' => ['array'],
            'label_ids.*' => ['integer', 'exists:labels,id'],
        ];
    }
}
