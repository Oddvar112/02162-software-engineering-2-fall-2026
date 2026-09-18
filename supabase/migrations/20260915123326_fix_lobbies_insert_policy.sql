ALTER POLICY "lobbies_insert"
ON "public"."lobbies"
TO authenticated
WITH CHECK (auth.uid() = created_by);
