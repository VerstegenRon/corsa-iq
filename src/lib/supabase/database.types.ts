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
      calendar_feeds: {
        Row: { created_at: string; garage_id: string; id: string; token: string; user_id: string }
        Insert: { created_at?: string; garage_id: string; id?: string; token: string; user_id?: string }
        Update: { created_at?: string; garage_id?: string; id?: string; token?: string; user_id?: string }
        Relationships: [
          {
            foreignKeyName: "calendar_feeds_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_items: {
        Row: {
          created_at: string
          ends_on: string | null
          garage_id: string
          id: string
          notes: string | null
          starts_at: string | null
          starts_on: string
          title: string
        }
        Insert: {
          created_at?: string
          ends_on?: string | null
          garage_id: string
          id?: string
          notes?: string | null
          starts_at?: string | null
          starts_on: string
          title: string
        }
        Update: {
          created_at?: string
          ends_on?: string | null
          garage_id?: string
          id?: string
          notes?: string | null
          starts_at?: string | null
          starts_on?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_items_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_items: {
        Row: { category: string; created_at: string; garage_id: string; id: string; title: string }
        Insert: { category: string; created_at?: string; garage_id: string; id?: string; title: string }
        Update: { category?: string; created_at?: string; garage_id?: string; id?: string; title?: string }
        Relationships: [
          {
            foreignKeyName: "checklist_items_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
        ]
      }
      event_checklist_items: {
        Row: {
          category: string
          checked: boolean
          checked_at: string | null
          created_at: string
          event_id: string
          garage_id: string
          id: string
          suggestion_key: string | null
          template_item_id: string | null
          title: string
        }
        Insert: {
          category: string
          checked?: boolean
          checked_at?: string | null
          created_at?: string
          event_id: string
          garage_id: string
          id?: string
          suggestion_key?: string | null
          template_item_id?: string | null
          title: string
        }
        Update: {
          category?: string
          checked?: boolean
          checked_at?: string | null
          created_at?: string
          event_id?: string
          garage_id?: string
          id?: string
          suggestion_key?: string | null
          template_item_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_checklist_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_checklist_items_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_checklist_items_template_item_id_fkey"
            columns: ["template_item_id"]
            isOneToOne: false
            referencedRelation: "checklist_items"
            referencedColumns: ["id"]
          },
        ]
      }
      prestart_checks: {
        Row: {
          created_at: string
          event_id: string
          garage_id: string
          id: string
          kart_id: string
          locked_at: string | null
          locked_by: string | null
          session_id: string | null
          session_label: string
          session_type: string | null
          setup_id: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          garage_id: string
          id?: string
          kart_id: string
          locked_at?: string | null
          locked_by?: string | null
          session_id?: string | null
          session_label: string
          session_type?: string | null
          setup_id?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          garage_id?: string
          id?: string
          kart_id?: string
          locked_at?: string | null
          locked_by?: string | null
          session_id?: string | null
          session_label?: string
          session_type?: string | null
          setup_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prestart_checks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prestart_checks_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prestart_checks_kart_id_fkey"
            columns: ["kart_id"]
            isOneToOne: false
            referencedRelation: "karts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prestart_checks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prestart_checks_setup_id_fkey"
            columns: ["setup_id"]
            isOneToOne: false
            referencedRelation: "setups"
            referencedColumns: ["id"]
          },
        ]
      }
      session_checks: {
        Row: {
          checked_at: string
          checked_by: string | null
          garage_id: string
          id: string
          key: string
          prestart_check_id: string
          status: string
          target: string | null
          tolerance: number | null
          value: string | null
        }
        Insert: {
          checked_at?: string
          checked_by?: string | null
          garage_id: string
          id?: string
          key: string
          prestart_check_id: string
          status?: string
          target?: string | null
          tolerance?: number | null
          value?: string | null
        }
        Update: {
          checked_at?: string
          checked_by?: string | null
          garage_id?: string
          id?: string
          key?: string
          prestart_check_id?: string
          status?: string
          target?: string | null
          tolerance?: number | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_checks_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_checks_prestart_check_id_fkey"
            columns: ["prestart_check_id"]
            isOneToOne: false
            referencedRelation: "prestart_checks"
            referencedColumns: ["id"]
          },
        ]
      }
      tyre_pressure_readings: {
        Row: {
          bar: number
          corner: string
          garage_id: string
          id: string
          measured_at: string
          measured_by: string | null
          prestart_check_id: string
          temp_state: string
        }
        Insert: {
          bar: number
          corner: string
          garage_id: string
          id?: string
          measured_at?: string
          measured_by?: string | null
          prestart_check_id: string
          temp_state?: string
        }
        Update: {
          bar?: number
          corner?: string
          garage_id?: string
          id?: string
          measured_at?: string
          measured_by?: string | null
          prestart_check_id?: string
          temp_state?: string
        }
        Relationships: [
          {
            foreignKeyName: "tyre_pressure_readings_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tyre_pressure_readings_prestart_check_id_fkey"
            columns: ["prestart_check_id"]
            isOneToOne: false
            referencedRelation: "prestart_checks"
            referencedColumns: ["id"]
          },
        ]
      }
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
          first_name: string
          garage_id: string
          id: string
          last_name: string | null
          licence_number: string | null
          name: string
          race_number: string | null
          user_id: string | null
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          first_name: string
          garage_id: string
          id?: string
          last_name?: string | null
          licence_number?: string | null
          race_number?: string | null
          user_id?: string | null
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          first_name?: string
          garage_id?: string
          id?: string
          last_name?: string | null
          licence_number?: string | null
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
          pole_lap_ms: number | null
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
          pole_lap_ms?: number | null
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
          pole_lap_ms?: number | null
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
          gear_item_id: string | null
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
          gear_item_id?: string | null
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
          gear_item_id?: string | null
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
            foreignKeyName: "expenses_gear_item_id_fkey"
            columns: ["gear_item_id"]
            isOneToOne: false
            referencedRelation: "gear_items"
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
      gear_items: {
        Row: {
          brand: string | null
          category: string
          created_at: string
          driver_id: string | null
          garage_id: string
          homologation: string | null
          id: string
          model: string | null
          notes: string | null
          purchase_price_cents: number | null
          purchased_on: string | null
          size: string | null
          status: string
          valid_until: string | null
        }
        Insert: {
          brand?: string | null
          category: string
          created_at?: string
          driver_id?: string | null
          garage_id: string
          homologation?: string | null
          id?: string
          model?: string | null
          notes?: string | null
          purchase_price_cents?: number | null
          purchased_on?: string | null
          size?: string | null
          status?: string
          valid_until?: string | null
        }
        Update: {
          brand?: string | null
          category?: string
          created_at?: string
          driver_id?: string | null
          garage_id?: string
          homologation?: string | null
          id?: string
          model?: string | null
          notes?: string | null
          purchase_price_cents?: number | null
          purchased_on?: string | null
          size?: string | null
          status?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gear_items_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gear_items_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
        ]
      }
      garage_billing: {
        Row: {
          cancel_at_period_end: boolean
          current_period_end: string | null
          garage_id: string
          price_lookup_key: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          current_period_end?: string | null
          garage_id: string
          price_lookup_key?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          current_period_end?: string | null
          garage_id?: string
          price_lookup_key?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "garage_billing_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: true
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
        ]
      }
      garage_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          created_by: string | null
          expires_at: string
          garage_id: string
          id: string
          label: string | null
          revoked_at: string | null
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string
          garage_id: string
          id?: string
          label?: string | null
          revoked_at?: string | null
          role: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string
          garage_id?: string
          id?: string
          label?: string | null
          revoked_at?: string | null
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "garage_invites_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
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
          component_limits: Json
          usage_limit_minutes: number | null
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
          component_limits?: Json
          usage_limit_minutes?: number | null
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
          component_limits?: Json
          usage_limit_minutes?: number | null
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
      lap_channels: {
        Row: {
          channels: string[]
          created_at: string
          garage_id: string
          lap_id: number
          length_m: number
          sample_m: number
          storage_path: string
        }
        Insert: {
          channels?: string[]
          created_at?: string
          garage_id: string
          lap_id: number
          length_m: number
          sample_m: number
          storage_path: string
        }
        Update: {
          channels?: string[]
          created_at?: string
          garage_id?: string
          lap_id?: number
          length_m?: number
          sample_m?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "lap_channels_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lap_channels_lap_id_fkey"
            columns: ["lap_id"]
            isOneToOne: true
            referencedRelation: "laps"
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
      live_laps: {
        Row: {
          gap_to_p1_ms: number | null
          garage_id: string
          id: number
          is_pit_lap: boolean
          lap_number: number
          lap_time_ms: number
          live_session_id: string
          max_egt_c: number | null
          max_rpm: number | null
          max_speed_kmh: number | null
          max_water_temp_c: number | null
          position: number | null
          recorded_at: string
          recorded_by: string | null
          sectors_ms: number[]
        }
        Insert: {
          gap_to_p1_ms?: number | null
          garage_id: string
          id?: never
          is_pit_lap?: boolean
          lap_number: number
          lap_time_ms: number
          live_session_id: string
          max_egt_c?: number | null
          max_rpm?: number | null
          max_speed_kmh?: number | null
          max_water_temp_c?: number | null
          position?: number | null
          recorded_at?: string
          recorded_by?: string | null
          sectors_ms?: number[]
        }
        Update: {
          gap_to_p1_ms?: number | null
          garage_id?: string
          id?: never
          is_pit_lap?: boolean
          lap_number?: number
          lap_time_ms?: number
          live_session_id?: string
          max_egt_c?: number | null
          max_rpm?: number | null
          max_speed_kmh?: number | null
          max_water_temp_c?: number | null
          position?: number | null
          recorded_at?: string
          recorded_by?: string | null
          sectors_ms?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "live_laps_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_laps_live_session_id_fkey"
            columns: ["live_session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_sessions: {
        Row: {
          created_at: string
          created_by: string | null
          driver_id: string
          ended_at: string | null
          event_id: string
          garage_id: string
          id: string
          kart_id: string
          label: string
          planned_laps: number | null
          reference_lap_id: number | null
          session_id: string | null
          session_type: string
          source: string
          started_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          driver_id: string
          ended_at?: string | null
          event_id: string
          garage_id: string
          id?: string
          kart_id: string
          label: string
          planned_laps?: number | null
          reference_lap_id?: number | null
          session_id?: string | null
          session_type: string
          source?: string
          started_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          driver_id?: string
          ended_at?: string | null
          event_id?: string
          garage_id?: string
          id?: string
          kart_id?: string
          label?: string
          planned_laps?: number | null
          reference_lap_id?: number | null
          session_id?: string | null
          session_type?: string
          source?: string
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_sessions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_sessions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_sessions_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_sessions_kart_id_fkey"
            columns: ["kart_id"]
            isOneToOne: false
            referencedRelation: "karts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_sessions_reference_lap_id_fkey"
            columns: ["reference_lap_id"]
            isOneToOne: false
            referencedRelation: "laps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      pit_messages: {
        Row: {
          cleared_at: string | null
          created_at: string
          created_by: string | null
          garage_id: string
          id: string
          live_session_id: string | null
          text: string
        }
        Insert: {
          cleared_at?: string | null
          created_at?: string
          created_by?: string | null
          garage_id: string
          id?: string
          live_session_id?: string | null
          text: string
        }
        Update: {
          cleared_at?: string | null
          created_at?: string
          created_by?: string | null
          garage_id?: string
          id?: string
          live_session_id?: string | null
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "pit_messages_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pit_messages_live_session_id_fkey"
            columns: ["live_session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
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
          component_limits: Json
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
          component_limits?: Json
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
          component_limits?: Json
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
          feedback_tags: Json | null
          driver_id: string
          duration_s: number | null
          event_id: string
          id: string
          kart_id: string
          position: number | null
          reference_lap_id: number | null
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
          feedback_tags?: Json | null
          duration_s?: number | null
          event_id: string
          id?: string
          kart_id: string
          position?: number | null
          reference_lap_id?: number | null
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
          feedback_tags?: Json | null
          event_id?: string
          id?: string
          kart_id?: string
          position?: number | null
          reference_lap_id?: number | null
          setup_id?: string | null
          started_at?: string
          track_layout_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_reference_lap_id_fkey"
            columns: ["reference_lap_id"]
            isOneToOne: false
            referencedRelation: "laps"
            referencedColumns: ["id"]
          },
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
          locked_at: string | null
          locked_by: string | null
          parent_setup_id: string | null
          template_id: string | null
          values: Json
        }
        Insert: {
          created_at?: string
          garage_id: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          parent_setup_id?: string | null
          template_id?: string | null
          values?: Json
        }
        Update: {
          created_at?: string
          garage_id?: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
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
      track_layout_corners: {
        Row: {
          apex_m: number
          created_at: string
          end_m: number
          garage_id: string
          id: string
          name: string | null
          number: number
          start_m: number
          track_layout_id: string
        }
        Insert: {
          apex_m: number
          created_at?: string
          end_m: number
          garage_id: string
          id?: string
          name?: string | null
          number: number
          start_m: number
          track_layout_id: string
        }
        Update: {
          apex_m?: number
          created_at?: string
          end_m?: number
          garage_id?: string
          id?: string
          name?: string | null
          number?: number
          start_m?: number
          track_layout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_layout_corners_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_layout_corners_track_layout_id_fkey"
            columns: ["track_layout_id"]
            isOneToOne: false
            referencedRelation: "track_layouts"
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
          city: string | null
          country: string | null
          created_at: string
          created_by_garage_id: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          created_by_garage_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
        }
        Update: {
          city?: string | null
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
      calendar_feed: { Args: { feed_token: string }; Returns: Json }
      accept_garage_invite: { Args: { p_token: string }; Returns: string }
      garage_team: {
        Args: { p_garage_id: string }
        Returns: { user_id: string; role: string; joined_at: string; display_name: string | null; email: string }[]
      }
      delete_my_account: { Args: never; Returns: undefined }
      my_account_garages: {
        Args: never
        Returns: { garage_id: string; garage_name: string; role: string; members: number; outcome: string }[]
      }
      garage_invite_info: {
        Args: { p_token: string }
        Returns: { garage_name: string; role: string; status: string }[]
      }
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
