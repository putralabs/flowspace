<?php

namespace App\Http\Requests\Comment;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCommentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('view', $this->route('task'));
    }

    /** @return array<string, array<mixed>> */
    public function rules(): array
    {
        return [
            'body' => ['required', 'string', 'max:5000'],
            // A reply must belong to the same task, not just any comment row.
            'parent_id' => [
                'nullable',
                Rule::exists('comments', 'id')->where('task_id', $this->route('task')->id),
            ],
        ];
    }
}
