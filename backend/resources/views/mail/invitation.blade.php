Halo!

Kamu diundang sebagai {{ $invitation->role }} di workspace "{{ $invitation->workspace->name }}".

Bergabung lewat tautan berikut:
{{ url(config('app.frontend_url').'/register?invite='.$invitation->token) }}

Sampai jumpa di Flowspace.
