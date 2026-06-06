-- migration_v7: exercise library, body measurements, progress photos

-- Exercise library
CREATE TABLE IF NOT EXISTS public.exercise_library (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name         text        NOT NULL,
  muscle_group text        NOT NULL,
  description  text,
  youtube_url  text,
  image_url    text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.exercise_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trainer manages own library" ON public.exercise_library
  FOR ALL USING (auth.uid() = trainer_id) WITH CHECK (auth.uid() = trainer_id);

-- Body measurements (entered by trainer)
CREATE TABLE IF NOT EXISTS public.body_measurements (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trainer_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  measured_at  date        NOT NULL DEFAULT CURRENT_DATE,
  weight_kg    numeric(5,1),
  body_fat_pct numeric(4,1),
  waist_cm     numeric(5,1),
  hip_cm       numeric(5,1),
  chest_cm     numeric(5,1),
  arm_cm       numeric(5,1),
  thigh_cm     numeric(5,1),
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trainer manages student measurements" ON public.body_measurements
  FOR ALL USING (auth.uid() = trainer_id) WITH CHECK (auth.uid() = trainer_id);
CREATE POLICY "Student reads own measurements" ON public.body_measurements
  FOR SELECT USING (auth.uid() = student_id);

-- Progress photos (uploaded by student)
CREATE TABLE IF NOT EXISTS public.progress_photos (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trainer_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  photo_url   text        NOT NULL,
  photo_type  text        NOT NULL DEFAULT 'front',
  taken_at    date        NOT NULL DEFAULT CURRENT_DATE,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Student manages own photos" ON public.progress_photos
  FOR ALL USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Trainer reads student photos" ON public.progress_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = student_id AND profiles.trainer_id = auth.uid()
    )
  );

-- Storage policies for progress-photos bucket
INSERT INTO storage.buckets (id, name, public)
  VALUES ('progress-photos', 'progress-photos', true)
  ON CONFLICT DO NOTHING;

CREATE POLICY "Student uploads own photos storage" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'progress-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Public read progress photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'progress-photos');

CREATE POLICY "Student deletes own photos storage" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'progress-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
