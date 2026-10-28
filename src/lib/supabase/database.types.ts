// Generated from the Supabase project schema. Regenerate after each migration.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      data_imports: {
        Row: {
          channel_summary: Json | null
          created_at: string
          error: string | null
          file_format: string | null
          file_path: string | null
          garage_id: string
          id: string
          source: string
          status: string
          telemetry_path: string | null
          uploaded_by: string | null
        }
        Insert: {
          channel_summary?: Json | null
          created_at?: string
          error?: string | null
          file_format?: string | null
          file_path?: string | null
          garage_id: string
          id?: string
          source: string
          status?: string
          telemetry_path?: string | null
          uploaded_by?: string | null
        }
        Update: {
          channel_summary?: Json | null
          created_at?: string
          error?: string | null
          file_format?: string | null
          file_path?: string | null
          garage_id?: string
          id?: string
          source?: string
          status?: string
          telemetry_path?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_imports_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          created_at: string
          garage_id: string
          id: string
          licence_number: string | null
          name: string
          race_number: string | null
          user_id: string | null
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          garage_id: string
          id?: string
          licence_number?: string | null
          name: string
          race_number?: string | null
          user_id?: string | null
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          garage_id?: string
          id?: string
          licence_number?: string | null
          name?: string
          race_number?: string | null
          user_id?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          ends_on: string | null
          garage_id: string
          id: string
          name: string
          notes: string | null
          result_position: number | null
          season_id: string | null
          starts_on: string
          track_id: string
          type: string
        }
        Insert: {
          created_at?: string
          ends_on?: string | null
          garage_id: string
          id?: string
          name: string
          notes?: string | null
          result_position?: number | null
          season_id?: string | null
          starts_on: string
          track_id: string
          type: string
        }
        Update: {
          created_at?: string
          ends_on?: string | null
          garage_id?: string
          id?: string
          name?: string
          notes?: string | null
          result_position?: number | null
          season_id?: string | null
          starts_on?: string
          track_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount_cents: number
          category: string
          created_at: string
          currency: string
          description: string | null
          event_id: string | null
          garage_id: string
          id: string
          maintenance_record_id: string | null
          part_id: string | null
          receipt_path: string | null
          season_id: string | null
          spent_on: string
        }
        Insert: {
          amount_cents: number
          category: string
          created_at?: string
          currency?: string
          description?: string | null
          event_id?: string | null
          garage_id: string
          id?: string
          maintenance_record_id?: string | null
          part_id?: string | null
          receipt_path?: string | null
          season_id?: string | null
          spent_on: string
        }
        Update: {
          amount_cents?: number
          category?: string
          created_at?: string
          currency?: string
          description?: string | null
          event_id?: string | null
          garage_id?: string
          id?: string
          maintenance_record_id?: string | null
          part_id?: string | null
          receipt_path?: string | null
          season_id?: string | null
          spent_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_maintenance_record_id_fkey"
            columns: ["maintenance_record_id"]
            isOneToOne: false
            referencedRelation: "maintenance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "part_usage"
            referencedColumns: ["part_id"]
          },
          {
            foreignKeyName: "expenses_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      garage_members: {
        Row: {
          created_at: string
          garage_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          garage_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          garage_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "garage_members_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
        ]
      }
      garages: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          id: string
          name: string
          plan: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          name: string
          plan?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          name?: string
          plan?: string
        }
        Relationships: []
      }
      karts: {
        Row: {
          chassis_brand: string | null
          chassis_model: string | null
          chassis_year: number | null
          class: string | null
          created_at: string
          garage_id: string
          homologation: string | null
          id: string
          name: string
          notes: string | null
          serial_number: string | null
          status: string
        }
        Insert: {
          chassis_brand?: string | null
          chassis_model?: string | null
          chassis_year?: number | null
          class?: string | null
          created_at?: string
          garage_id: string
          homologation?: string | null
          id?: string
          name: string
          notes?: string | null
          serial_number?: string | null
          status?: string
        }
        Update: {
          chassis_brand?: string | null
          chassis_model?: string | null
          chassis_year?: number | null
          class?: string | null
          created_at?: string
          garage_id?: string
          homologation?: string | null
          id?: string
          name?: string
          notes?: string | null
          serial_number?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "karts_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
        ]
      }
      lap_sectors: {
        Row: {
          lap_id: number
          sector_number: number
          sector_time_ms: number
        }
        Insert: {
          lap_id: number
          sector_number: number
          sector_time_ms: number
        }
        Update: {
          lap_id?: number
          sector_number?: number
          sector_time_ms?: number
        }
        Relationships: [
          {
            foreignKeyName: "lap_sectors_lap_id_fkey"
            columns: ["lap_id"]
            isOneToOne: false
            referencedRelation: "laps"
            referencedColumns: ["id"]
          },
        ]
      }
      laps: {
        Row: {
          id: number
          is_pit_lap: boolean
          is_valid: boolean
          lap_number: number
          lap_time_ms: number
          max_egt_c: number | null
          max_rpm: number | null
          max_speed_kmh: number | null
          max_water_temp_c: number | null
          min_speed_kmh: number | null
          session_id: string
        }
        Insert: {
          id?: never
          is_pit_lap?: boolean
          is_valid?: boolean
          lap_number: number
          lap_time_ms: number
          max_egt_c?: number | null
          max_rpm?: number | null
          max_speed_kmh?: number | null
          max_water_temp_c?: number | null
          min_speed_kmh?: number | null
          session_id: string
        }
        Update: {
          id?: never
          is_pit_lap?: boolean
          is_valid?: boolean
          lap_number?: number
          lap_time_ms?: number
          max_egt_c?: number | null
          max_rpm?: number | null
          max_speed_kmh?: number | null
          max_water_temp_c?: number | null
          min_speed_kmh?: number | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "laps_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_records: {
        Row: {
          components: string[]
          created_at: string
          description: string | null
          garage_id: string
          id: string
          kart_id: string | null
          part_id: string | null
          performed_by: string | null
          performed_on: string
          resets_usage: boolean
          type: string
        }
        Insert: {
          components?: string[]
          created_at?: string
          description?: string | null
          garage_id: string
          id?: string
          kart_id?: string | null
          part_id?: string | null
          performed_by?: string | null
          performed_on: string
          resets_usage?: boolean
          type: string
        }
        Update: {
          components?: string[]
          created_at?: string
          description?: string | null
          garage_id?: string
          id?: string
          kart_id?: string | null
          part_id?: string | null
          performed_by?: string | null
          performed_on?: string
          resets_usage?: boolean
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_records_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_kart_id_fkey"
            columns: ["kart_id"]
            isOneToOne: false
            referencedRelation: "karts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "part_usage"
            referencedColumns: ["part_id"]
          },
          {
            foreignKeyName: "maintenance_records_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
      part_installations: {
        Row: {
          id: string
          installed_at: string
          kart_id: string
          part_id: string
          removed_at: string | null
        }
        Insert: {
          id?: string
          installed_at?: string
          kart_id: string
          part_id: string
          removed_at?: string | null
        }
        Update: {
          id?: string
          installed_at?: string
          kart_id?: string
          part_id?: string
          removed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "part_installations_kart_id_fkey"
            columns: ["kart_id"]
            isOneToOne: false
            referencedRelation: "karts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_installations_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "part_usage"
            referencedColumns: ["part_id"]
          },
          {
            foreignKeyName: "part_installations_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
      parts: {
        Row: {
          brand: string | null
          category: string
          created_at: string
          garage_id: string
          id: string
          model: string | null
          notes: string | null
          purchase_price_cents: number | null
          purchased_on: string | null
          serial_number: string | null
          spec: Json
          status: string
          usage_limit_minutes: number | null
        }
        Insert: {
          brand?: string | null
          category: string
          created_at?: string
          garage_id: string
          id?: string
          model?: string | null
          notes?: string | null
          purchase_price_cents?: number | null
          purchased_on?: string | null
          serial_number?: string | null
          spec?: Json
          status?: string
          usage_limit_minutes?: number | null
        }
        Update: {
          brand?: string | null
          category?: string
          created_at?: string
          garage_id?: string
          id?: string
          model?: string | null
          notes?: string | null
          purchase_price_cents?: number | null
          purchased_on?: string | null
          serial_number?: string | null
          spec?: Json
          status?: string
          usage_limit_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "parts_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          currency: string
          display_name: string | null
          id: string
          locale: string
          unit_system: string
        }
        Insert: {
          created_at?: string
          currency?: string
          display_name?: string | null
          id: string
          locale?: string
          unit_system?: string
        }
        Update: {
          created_at?: string
          currency?: string
          display_name?: string | null
          id?: string
          locale?: string
          unit_system?: string
        }
        Relationships: []
      }
      seasons: {
        Row: {
          budget_cents: number | null
          championship: string | null
          class: string | null
          created_at: string
          driver_id: string | null
          garage_id: string
          id: string
          name: string
          year: number
        }
        Insert: {
          budget_cents?: number | null
          championship?: string | null
          class?: string | null
          created_at?: string
          driver_id?: string | null
          garage_id: string
          id?: string
          name: string
          year: number
        }
        Update: {
          budget_cents?: number | null
          championship?: string | null
          class?: string | null
          created_at?: string
          driver_id?: string | null
          garage_id?: string
          id?: string
          name?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "seasons_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seasons_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
        ]
      }
      session_parts: {
        Row: {
          part_id: string
          session_id: string
        }
        Insert: {
          part_id: string
          session_id: string
        }
        Update: {
          part_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_parts_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "part_usage"
            referencedColumns: ["part_id"]
          },
          {
            foreignKeyName: "session_parts_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_parts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          best_lap_ms: number | null
          conditions: Json
          created_at: string
          data_import_id: string | null
          driver_feedback: string | null
          driver_id: string
          duration_s: number | null
          event_id: string
          id: string
          kart_id: string
          position: number | null
          setup_id: string | null
          started_at: string
          track_layout_id: string | null
          type: string
        }
        Insert: {
          best_lap_ms?: number | null
          conditions?: Json
          created_at?: string
          data_import_id?: string | null
          driver_feedback?: string | null
          driver_id: string
          duration_s?: number | null
          event_id: string
          id?: string
          kart_id: string
          position?: number | null
          setup_id?: string | null
          started_at: string
          track_layout_id?: string | null
          type: string
        }
        Update: {
          best_lap_ms?: number | null
          conditions?: Json
          created_at?: string
          data_import_id?: string | null
          driver_feedback?: string | null
          driver_id?: string
          duration_s?: number | null
          event_id?: string
          id?: string
          kart_id?: string
          position?: number | null
          setup_id?: string | null
          started_at?: string
          track_layout_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_data_import_id_fkey"
            columns: ["data_import_id"]
            isOneToOne: false
            referencedRelation: "data_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_kart_id_fkey"
            columns: ["kart_id"]
            isOneToOne: false
            referencedRelation: "karts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_setup_id_fkey"
            columns: ["setup_id"]
            isOneToOne: false
            referencedRelation: "setups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_track_layout_id_fkey"
            columns: ["track_layout_id"]
            isOneToOne: false
            referencedRelation: "track_layouts"
            referencedColumns: ["id"]
          },
        ]
      }
      setup_templates: {
        Row: {
          created_at: string
          garage_id: string
          id: string
          kart_id: string | null
          name: string
          track_id: string | null
          values: Json
        }
        Insert: {
          created_at?: string
          garage_id: string
          id?: string
          kart_id?: string | null
          name: string
          track_id?: string | null
          values?: Json
        }
        Update: {
          created_at?: string
          garage_id?: string
          id?: string
          kart_id?: string | null
          name?: string
          track_id?: string | null
          values?: Json
        }
        Relationships: [
          {
            foreignKeyName: "setup_templates_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setup_templates_kart_id_fkey"
            columns: ["kart_id"]
            isOneToOne: false
            referencedRelation: "karts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setup_templates_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      setups: {
        Row: {
          created_at: string
          garage_id: string
          id: string
          parent_setup_id: string | null
          template_id: string | null
          values: Json
        }
        Insert: {
          created_at?: string
          garage_id: string
          id?: string
          parent_setup_id?: string | null
          template_id?: string | null
          values?: Json
        }
        Update: {
          created_at?: string
          garage_id?: string
          id?: string
          parent_setup_id?: string | null
          template_id?: string | null
          values?: Json
        }
        Relationships: [
          {
            foreignKeyName: "setups_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setups_parent_setup_id_fkey"
            columns: ["parent_setup_id"]
            isOneToOne: false
            referencedRelation: "setups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setups_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "setup_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      track_layouts: {
        Row: {
          created_at: string
          id: string
          length_m: number | null
          name: string
          sector_count: number | null
          track_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          length_m?: number | null
          name: string
          sector_count?: number | null
          track_id: string
        }
        Update: {
          created_at?: string
          id?: string
          length_m?: number | null
          name?: string
          sector_count?: number | null
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_layouts_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      tracks: {
        Row: {
          country: string | null
          created_at: string
          created_by_garage_id: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          created_by_garage_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
        }
        Update: {
          country?: string | null
          created_at?: string
          created_by_garage_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracks_created_by_garage_id_fkey"
            columns: ["created_by_garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      part_usage: {
        Row: {
          garage_id: string | null
          minutes_since_reset: number | null
          minutes_total: number | null
          part_id: string | null
          session_count: number | null
          usage_limit_minutes: number | null
        }
        Relationships: [
          {
            foreignKeyName: "parts_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      replace_session_laps: {
        Args: { p_data_import_id: string; p_laps: Json; p_session_id: string }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never
