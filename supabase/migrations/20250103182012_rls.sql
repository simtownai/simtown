
-- Enable RLS on all tables
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."map" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."thread" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."thread_participant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."npc" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."npc_instance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."npc_room" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."room" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."room_instance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_room_instance" ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view their own data" ON "public"."users"
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own data" ON "public"."users"
    FOR UPDATE USING (auth.uid() = id);

-- Map table policies (read-only for everyone)
CREATE POLICY "Maps are visible to everyone" ON "public"."map"
    FOR SELECT USING (true);

-- Message table policies
CREATE POLICY "Users can view messages in their threads" ON "public"."message"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM thread_participant tp 
            WHERE tp.thread_id = message.thread_id 
            AND tp.user_id = auth.uid()
        )
    );
CREATE POLICY "Users can insert messages in their threads" ON "public"."message"
    FOR INSERT WITH CHECK (
        auth.uid() = from_user_id AND
        EXISTS (
            SELECT 1 FROM thread_participant tp 
            WHERE tp.thread_id = message.thread_id 
            AND tp.user_id = auth.uid()
        )
    );

-- Thread policies
CREATE POLICY "Users can view their threads" ON "public"."thread"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM thread_participant tp 
            WHERE tp.thread_id = id 
            AND tp.user_id = auth.uid()
        )
    );

-- Thread participant policies
CREATE POLICY "Users can view their thread participants" ON "public"."thread_participant"
    FOR SELECT USING (user_id = auth.uid());

-- NPC related tables (read-only for everyone)
CREATE POLICY "NPCs are visible to everyone" ON "public"."npc"
    FOR SELECT USING (true);
CREATE POLICY "NPC instances are visible to everyone" ON "public"."npc_instance"
    FOR SELECT USING (true);
CREATE POLICY "NPC room assignments are visible to everyone" ON "public"."npc_room"
    FOR SELECT USING (true);

-- Room policies
CREATE POLICY "Rooms are visible if marked as visible" ON "public"."room"
    FOR SELECT USING (visible = true);

-- Room instance policies
CREATE POLICY "Users can view their room instances" ON "public"."room_instance"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_room_instance uri 
            WHERE uri.room_instance_id = id 
            AND uri.user_id = auth.uid()
        )
    );

-- User room instance policies
CREATE POLICY "Users can view their room instance assignments" ON "public"."user_room_instance"
    FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert their room instance assignments" ON "public"."user_room_instance"
    FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete their room instance assignments" ON "public"."user_room_instance"
    FOR DELETE USING (user_id = auth.uid());