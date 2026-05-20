ALTER TABLE photo_matches
ADD COLUMN IF NOT EXISTS photo_face_id UUID REFERENCES photo_faces(id);