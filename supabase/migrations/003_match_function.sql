CREATE OR REPLACE FUNCTION public.match_photo_faces_for_event(
    p_event_id UUID,
    p_embedding TEXT
)
RETURNS TABLE (
    photo_id UUID,
    face_id UUID,
    similarity DOUBLE PRECISION
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        pf.photo_id,
        pf.id AS face_id,
        1 - (pf.face_embedding <=> p_embedding::vector(512)) AS similarity
    FROM public.photo_faces pf
    JOIN public.event_photos ep
        ON ep.id = pf.photo_id
    WHERE ep.event_id = p_event_id
    ORDER BY pf.face_embedding <=> p_embedding::vector(512);
$$;