<?php

namespace App\Events;

class TaskDeleted extends ProjectEvent
{
    protected function fields(): array
    {
        return ['id'];
    }
}
