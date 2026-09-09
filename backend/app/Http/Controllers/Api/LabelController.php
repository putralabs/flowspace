<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Label\StoreLabelRequest;
use App\Http\Requests\Label\UpdateLabelRequest;
use App\Models\Label;
use App\Models\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LabelController extends Controller
{
    public function index(Request $request, Workspace $workspace): JsonResponse
    {
        abort_unless(\App\Support\Membership::canView($request->user(), $workspace), 403, 'Kamu bukan anggota workspace ini.');

        return response()->json($workspace->labels()->orderBy('name')->get());
    }

    public function store(StoreLabelRequest $request, Workspace $workspace): JsonResponse
    {
        $label = $workspace->labels()->create($request->validated());

        return response()->json($label, 201);
    }

    public function update(UpdateLabelRequest $request, Label $label): JsonResponse
    {
        $label->update($request->validated());

        return response()->json($label);
    }

    public function destroy(Request $request, Label $label): JsonResponse
    {
        $this->authorize('manage', $label->workspace);

        $label->delete();

        return response()->json(status: 204);
    }
}
