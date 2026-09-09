<?php

namespace App\Http\Requests\Comment;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCommentRequest extends FormRequest
{
    public function authorize(): bool
    {
        $comment = $this->route('comment');

        return (int) $comment->user_id === (int) $this->user()->id;
    }

    /** @return array<string, array<mixed>> */
    public function rules(): array
    {
        return [
            'body' => ['required', 'string', 'max:5000'],
        ];
    }

    public function messages(): array
    {
        return [
            'authorized' => 'Kamu hanya dapat mengedit komentar sendiri.',
        ];
    }
}
