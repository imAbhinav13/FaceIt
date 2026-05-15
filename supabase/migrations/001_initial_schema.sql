CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.face_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    embedding VECTOR(512),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code TEXT UNIQUE NOT NULL,
    created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT,
    status TEXT DEFAULT 'created',
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.event_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    processing_status TEXT DEFAULT 'pending',
    uploaded_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.photo_faces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id UUID REFERENCES public.event_photos(id) ON DELETE CASCADE,
    face_embedding VECTOR(512),
    bounding_box JSONB,
    detected_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.photo_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id UUID REFERENCES public.event_photos(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    guest_session_id UUID,
    confidence FLOAT,
    status TEXT DEFAULT 'confirmed',
    matched_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.job_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error TEXT
);

CREATE INDEX IF NOT EXISTS photo_faces_embedding_idx
ON public.photo_faces
USING ivfflat (face_embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS face_embeddings_embedding_idx
ON public.face_embeddings
USING ivfflat (embedding vector_cosine_ops);