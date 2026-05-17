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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          points: number
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          points?: number
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          points?: number
        }
        Relationships: []
      }
      proximity_alerts: {
        Row: {
          active: boolean
          created_at: string
          fuel_type: Database["public"]["Enums"]["fuel_type"]
          id: string
          station_id: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          fuel_type: Database["public"]["Enums"]["fuel_type"]
          id?: string
          station_id: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          fuel_type?: Database["public"]["Enums"]["fuel_type"]
          id?: string
          station_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proximity_alerts_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          device_id: string | null
          fuel_type: Database["public"]["Enums"]["fuel_type"]
          id: string
          note: string | null
          price_kz: number | null
          queue_minutes: number | null
          source: Database["public"]["Enums"]["report_source"]
          station_id: string
          status: Database["public"]["Enums"]["station_status"]
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          fuel_type: Database["public"]["Enums"]["fuel_type"]
          id?: string
          note?: string | null
          price_kz?: number | null
          queue_minutes?: number | null
          source?: Database["public"]["Enums"]["report_source"]
          station_id: string
          status: Database["public"]["Enums"]["station_status"]
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          fuel_type?: Database["public"]["Enums"]["fuel_type"]
          id?: string
          note?: string | null
          price_kz?: number | null
          queue_minutes?: number | null
          source?: Database["public"]["Enums"]["report_source"]
          station_id?: string
          status?: Database["public"]["Enums"]["station_status"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      station_manager_requests: {
        Row: {
          created_at: string
          full_name: string
          id: string
          phone: string
          proof: string | null
          station_id: string | null
          station_name_hint: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          phone: string
          proof?: string | null
          station_id?: string | null
          station_name_hint?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          phone?: string
          proof?: string | null
          station_id?: string | null
          station_name_hint?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "station_manager_requests_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      station_managers: {
        Row: {
          created_at: string
          id: string
          role: string
          station_id: string
          user_id: string
          verified_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          station_id: string
          user_id: string
          verified_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          station_id?: string
          user_id?: string
          verified_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "station_managers_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      stations: {
        Row: {
          address: string | null
          brand: string | null
          confirmations_count: number
          created_at: string
          id: string
          lat: number
          lng: number
          name: string
          province: string
          status: Database["public"]["Enums"]["station_approval"]
          submitted_by_device_id: string | null
          submitted_by_user_id: string | null
        }
        Insert: {
          address?: string | null
          brand?: string | null
          confirmations_count?: number
          created_at?: string
          id?: string
          lat: number
          lng: number
          name: string
          province?: string
          status?: Database["public"]["Enums"]["station_approval"]
          submitted_by_device_id?: string | null
          submitted_by_user_id?: string | null
        }
        Update: {
          address?: string | null
          brand?: string | null
          confirmations_count?: number
          created_at?: string
          id?: string
          lat?: number
          lng?: number
          name?: string
          province?: string
          status?: Database["public"]["Enums"]["station_approval"]
          submitted_by_device_id?: string | null
          submitted_by_user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      station_status_latest: {
        Row: {
          fuel_type: Database["public"]["Enums"]["fuel_type"] | null
          price_kz: number | null
          queue_minutes: number | null
          reported_at: string | null
          source: Database["public"]["Enums"]["report_source"] | null
          station_id: string | null
          status: Database["public"]["Enums"]["station_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_station_manager: {
        Args: { _station_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "station_owner"
      fuel_type: "gasolina" | "gasoleo"
      report_source: "community" | "official"
      station_approval: "pending" | "approved" | "rejected"
      station_status: "disponivel" | "pouco" | "sem_stock"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user", "station_owner"],
      fuel_type: ["gasolina", "gasoleo"],
      report_source: ["community", "official"],
      station_approval: ["pending", "approved", "rejected"],
      station_status: ["disponivel", "pouco", "sem_stock"],
    },
  },
} as const
