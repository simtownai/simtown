export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      chats: {
        Row: {
          character_name: string
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          character_name: string
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          character_name?: string
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      map: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          map_json_filename: string
          name: string
          spawn_place_name: string
          tileset_png_filename: string
          voting_place_name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          map_json_filename: string
          name: string
          spawn_place_name: string
          tileset_png_filename: string
          voting_place_name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          map_json_filename?: string
          name?: string
          spawn_place_name?: string
          tileset_png_filename?: string
          voting_place_name?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          chat_id: string
          content: Json
          created_at: string
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          chat_id: string
          content: Json
          created_at?: string
          id?: string
          role: string
          updated_at?: string
        }
        Update: {
          chat_id?: string
          content?: Json
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      npc: {
        Row: {
          available_actions: Database["public"]["Enums"]["npc_action"][]
          backstory: string
          created_at: string | null
          id: number
          name: string
          sprite_definition: Json
        }
        Insert: {
          available_actions: Database["public"]["Enums"]["npc_action"][]
          backstory: string
          created_at?: string | null
          id?: number
          name: string
          sprite_definition: Json
        }
        Update: {
          available_actions?: Database["public"]["Enums"]["npc_action"][]
          backstory?: string
          created_at?: string | null
          id?: number
          name?: string
          sprite_definition?: Json
        }
        Relationships: []
      }
      npc_instance: {
        Row: {
          created_at: string | null
          id: number
          last_update: string | null
          npc_id: number | null
          position_x: number | null
          position_y: number | null
          reflections: string[] | null
          room_instance_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          last_update?: string | null
          npc_id?: number | null
          position_x?: number | null
          position_y?: number | null
          reflections?: string[] | null
          room_instance_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          last_update?: string | null
          npc_id?: number | null
          position_x?: number | null
          position_y?: number | null
          reflections?: string[] | null
          room_instance_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "npc_instance_npc_id_fkey"
            columns: ["npc_id"]
            isOneToOne: false
            referencedRelation: "npc"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "npc_instance_room_instance_id_fkey"
            columns: ["room_instance_id"]
            isOneToOne: false
            referencedRelation: "room_instance"
            referencedColumns: ["id"]
          },
        ]
      }
      npc_room: {
        Row: {
          npc_id: number
          room_id: number
        }
        Insert: {
          npc_id: number
          room_id: number
        }
        Update: {
          npc_id?: number
          room_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "npc_room_npc_id_fkey"
            columns: ["npc_id"]
            isOneToOne: false
            referencedRelation: "npc"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "npc_room_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "room"
            referencedColumns: ["id"]
          },
        ]
      }
      room: {
        Row: {
          created_at: string | null
          id: number
          map_id: number
          name: string
          scenario: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          map_id: number
          name: string
          scenario: string
        }
        Update: {
          created_at?: string | null
          id?: number
          map_id?: number
          name?: string
          scenario?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "map"
            referencedColumns: ["id"]
          },
        ]
      }
      room_instance: {
        Row: {
          created_at: string | null
          id: string
          last_update: string | null
          newspaper: Json[] | null
          room_id: number | null
          type: Database["public"]["Enums"]["room_type"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_update?: string | null
          newspaper?: Json[] | null
          room_id?: number | null
          type?: Database["public"]["Enums"]["room_type"]
        }
        Update: {
          created_at?: string | null
          id?: string
          last_update?: string | null
          newspaper?: Json[] | null
          room_id?: number | null
          type?: Database["public"]["Enums"]["room_type"]
        }
        Relationships: [
          {
            foreignKeyName: "room_instance_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "room"
            referencedColumns: ["id"]
          },
        ]
      }
      user_room_instance: {
        Row: {
          room_instance_id: string
          user_id: string
        }
        Insert: {
          room_instance_id: string
          user_id: string
        }
        Update: {
          room_instance_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_room_instance_room_instance_id_fkey"
            columns: ["room_instance_id"]
            isOneToOne: false
            referencedRelation: "room_instance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_room_instance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      votes: {
        Row: {
          chat_id: string
          is_upvoted: boolean
          message_id: string
        }
        Insert: {
          chat_id: string
          is_upvoted: boolean
          message_id: string
        }
        Update: {
          chat_id?: string
          is_upvoted?: boolean
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_room_instance: {
        Args: {
          p_id: string
          p_room_id: number
          p_npc_ids: number[]
          p_type?: Database["public"]["Enums"]["room_type"]
        }
        Returns: string
      }
      get_document_latest_version: {
        Args: {
          doc_id: string
        }
        Returns: string
      }
      get_latest_document: {
        Args: {
          doc_id: string
          auth_user_id: string
        }
        Returns: {
          id: string
          user_id: string
          title: string
          content: string
          created_at: string
        }[]
      }
      get_next_file_version: {
        Args: {
          p_bucket_id: string
          p_storage_path: string
        }
        Returns: number
      }
      gtrgm_compress: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      gtrgm_in: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      gtrgm_options: {
        Args: {
          "": unknown
        }
        Returns: undefined
      }
      gtrgm_out: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      set_limit: {
        Args: {
          "": number
        }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: {
          "": string
        }
        Returns: string[]
      }
    }
    Enums: {
      npc_action:
        | "movetocoordinates"
        | "movetoplace"
        | "movetoperson"
        | "talk"
        | "vote"
        | "idle"
        | "broadcast"
        | "listen"
      room_type: "private" | "shared"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] & PublicSchema["Views"]) | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    ? (PublicSchema["Tables"] & PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends keyof PublicSchema["Tables"] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends keyof PublicSchema["Tables"] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends keyof PublicSchema["Enums"] | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"] | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
