CREATE TYPE npc_action AS ENUM ('move', 'talk', 'vote', 'idle', 'broadcast', 'listen');

CREATE TABLE map_config (
    id SERIAL PRIMARY KEY,
    map_json_filename VARCHAR(255) NOT NULL,
    tileset_png_filename VARCHAR(255) NOT NULL,
    collision_layer_name VARCHAR(255) NOT NULL,
    roads_layer_name VARCHAR(255) NOT NULL,
    places_layer_name VARCHAR(255) NOT NULL,
    spawn_place_name VARCHAR(255) NOT NULL,
    voting_place_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE npc (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    backstory TEXT NOT NULL,
    available_actions npc_action[] NOT NULL,
    sprite_definition JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE room (
    id SERIAL PRIMARY KEY,
    scenario TEXT NOT NULL,
    map_config_id INTEGER REFERENCES map_config(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE room_instance (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_id INTEGER REFERENCES room(id),
    last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE npc_instance (
    id SERIAL PRIMARY KEY,
    npc_id INTEGER REFERENCES npc(id),
    room_instance_id UUID REFERENCES room_instance(id),
    reflections TEXT[] DEFAULT '{}',
    position_x INTEGER NOT NULL,
    position_y INTEGER NOT NULL,
    last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE user_room_instance (
    user_id UUID REFERENCES users(id),
    room_instance_id UUID REFERENCES room_instance(id),
    PRIMARY KEY (user_id, room_instance_id)
);


CREATE INDEX idx_npc_instances_room ON npc_instance(room_instance_id);
CREATE INDEX idx_rooms_map_config ON room(map_config_id);



-- TRIGGER for updating the last_update timestamp for room_instance and npc_instance
CREATE OR REPLACE FUNCTION update_last_update()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_update = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_room_instance_timestamp
    BEFORE UPDATE ON room_instance
    FOR EACH ROW
    EXECUTE FUNCTION update_last_update();

CREATE TRIGGER update_npc_instance_timestamp
    BEFORE UPDATE ON npc_instance
    FOR EACH ROW
    EXECUTE FUNCTION update_last_update();