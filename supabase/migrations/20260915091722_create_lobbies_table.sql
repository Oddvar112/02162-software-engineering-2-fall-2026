-- Create users table
CREATE TABLE public.lobbies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  max_players INTEGER NOT NULL DEFAULT 4
);

-- RLS policy: anyone can select any lobby
CREATE POLICY "lobbies_select" ON public.lobbies
  FOR SELECT USING (true);

-- RLS policy: only creator can update/delete their own lobby
CREATE POLICY "lobbies_update" ON public.lobbies
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "lobbies_delete" ON public.lobbies
  FOR DELETE USING (auth.uid() = created_by);

-- RLS policy: authenticated users can insert (create lobbies)
CREATE POLICY "lobbies_insert" ON public.lobbies
  FOR INSERT WITH CHECK (auth.uid() = created_by);
