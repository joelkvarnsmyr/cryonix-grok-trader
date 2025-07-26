export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      bot_activities: {
        Row: {
          activity_type: string
          bot_id: string
          created_at: string
          data: Json | null
          description: string
          id: string
          status: string | null
          title: string
          user_id: string
        }
        Insert: {
          activity_type: string
          bot_id: string
          created_at?: string
          data?: Json | null
          description: string
          id?: string
          status?: string | null
          title: string
          user_id: string
        }
        Update: {
          activity_type?: string
          bot_id?: string
          created_at?: string
          data?: Json | null
          description?: string
          id?: string
          status?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_activities_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "trading_bots"
            referencedColumns: ["id"]
          },
        ]
      }
      market_data: {
        Row: {
          change_24h: number
          change_percent_24h: number
          high_24h: number
          id: string
          low_24h: number
          market_cap: number | null
          price: number
          symbol: string
          timestamp: string
          volume_24h: number
        }
        Insert: {
          change_24h: number
          change_percent_24h: number
          high_24h: number
          id?: string
          low_24h: number
          market_cap?: number | null
          price: number
          symbol: string
          timestamp?: string
          volume_24h: number
        }
        Update: {
          change_24h?: number
          change_percent_24h?: number
          high_24h?: number
          id?: string
          low_24h?: number
          market_cap?: number | null
          price?: number
          symbol?: string
          timestamp?: string
          volume_24h?: number
        }
        Relationships: []
      }
      performance_metrics: {
        Row: {
          bot_id: string | null
          created_at: string
          daily_pnl: number
          id: string
          losing_trades: number
          max_drawdown: number
          metric_date: string
          profit_factor: number
          sharpe_ratio: number | null
          total_pnl: number
          total_trades: number
          user_id: string
          volatility: number | null
          win_rate: number
          winning_trades: number
        }
        Insert: {
          bot_id?: string | null
          created_at?: string
          daily_pnl?: number
          id?: string
          losing_trades?: number
          max_drawdown?: number
          metric_date: string
          profit_factor?: number
          sharpe_ratio?: number | null
          total_pnl?: number
          total_trades?: number
          user_id: string
          volatility?: number | null
          win_rate?: number
          winning_trades?: number
        }
        Update: {
          bot_id?: string | null
          created_at?: string
          daily_pnl?: number
          id?: string
          losing_trades?: number
          max_drawdown?: number
          metric_date?: string
          profit_factor?: number
          sharpe_ratio?: number | null
          total_pnl?: number
          total_trades?: number
          user_id?: string
          volatility?: number | null
          win_rate?: number
          winning_trades?: number
        }
        Relationships: [
          {
            foreignKeyName: "performance_metrics_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "trading_bots"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_holdings: {
        Row: {
          avg_buy_price: number
          bot_id: string | null
          created_at: string
          current_value: number
          id: string
          last_updated: string
          quantity: number
          symbol: string
          unrealized_pnl: number
          user_id: string
        }
        Insert: {
          avg_buy_price?: number
          bot_id?: string | null
          created_at?: string
          current_value?: number
          id?: string
          last_updated?: string
          quantity?: number
          symbol: string
          unrealized_pnl?: number
          user_id: string
        }
        Update: {
          avg_buy_price?: number
          bot_id?: string | null
          created_at?: string
          current_value?: number
          id?: string
          last_updated?: string
          quantity?: number
          symbol?: string
          unrealized_pnl?: number
          user_id?: string
        }
        Relationships: []
      }
      system_config: {
        Row: {
          config_key: string
          config_value: Json
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          config_key: string
          config_value: Json
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          config_key?: string
          config_value?: Json
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trades: {
        Row: {
          action: string
          bot_id: string | null
          confidence: number | null
          created_at: string
          exchange_order_id: string | null
          executed_at: string | null
          fees: number | null
          id: string
          notes: string | null
          pnl: number | null
          price: number
          quantity: number
          status: string
          symbol: string
          total_value: number
          user_id: string
        }
        Insert: {
          action: string
          bot_id?: string | null
          confidence?: number | null
          created_at?: string
          exchange_order_id?: string | null
          executed_at?: string | null
          fees?: number | null
          id?: string
          notes?: string | null
          pnl?: number | null
          price: number
          quantity: number
          status?: string
          symbol: string
          total_value: number
          user_id: string
        }
        Update: {
          action?: string
          bot_id?: string | null
          confidence?: number | null
          created_at?: string
          exchange_order_id?: string | null
          executed_at?: string | null
          fees?: number | null
          id?: string
          notes?: string | null
          pnl?: number | null
          price?: number
          quantity?: number
          status?: string
          symbol?: string
          total_value?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "trading_bots"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_bots: {
        Row: {
          created_at: string
          current_balance: number
          daily_pnl: number
          daily_trades: number
          id: string
          initial_balance: number
          max_drawdown: number
          name: string
          risk_settings: Json
          status: string
          strategy: string
          symbol: string
          total_pnl: number
          total_trades: number
          updated_at: string
          uptime_hours: number
          user_id: string
          version: string
          win_rate: number
        }
        Insert: {
          created_at?: string
          current_balance?: number
          daily_pnl?: number
          daily_trades?: number
          id?: string
          initial_balance?: number
          max_drawdown?: number
          name: string
          risk_settings?: Json
          status?: string
          strategy: string
          symbol: string
          total_pnl?: number
          total_trades?: number
          updated_at?: string
          uptime_hours?: number
          user_id: string
          version?: string
          win_rate?: number
        }
        Update: {
          created_at?: string
          current_balance?: number
          daily_pnl?: number
          daily_trades?: number
          id?: string
          initial_balance?: number
          max_drawdown?: number
          name?: string
          risk_settings?: Json
          status?: string
          strategy?: string
          symbol?: string
          total_pnl?: number
          total_trades?: number
          updated_at?: string
          uptime_hours?: number
          user_id?: string
          version?: string
          win_rate?: number
        }
        Relationships: []
      }
      wallet_balances: {
        Row: {
          available_balance: number
          bot_id: string | null
          created_at: string
          currency: string
          id: string
          last_updated: string
          reserved_balance: number
          total_balance: number
          user_id: string
        }
        Insert: {
          available_balance?: number
          bot_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          last_updated?: string
          reserved_balance?: number
          total_balance?: number
          user_id: string
        }
        Update: {
          available_balance?: number
          bot_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          last_updated?: string
          reserved_balance?: number
          total_balance?: number
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cron_schedule: {
        Args: { job_name: string; cron: string; command: string }
        Returns: undefined
      }
      cron_unschedule: {
        Args: { job_name: string }
        Returns: undefined
      }
      get_portfolio_summary: {
        Args: { p_user_id: string; p_bot_id?: string }
        Returns: {
          total_value: number
          available_cash: number
          total_unrealized_pnl: number
          position_count: number
          largest_position_symbol: string
          largest_position_percentage: number
        }[]
      }
      initialize_bot_portfolio: {
        Args: {
          p_user_id: string
          p_bot_id: string
          p_starting_balance?: number
        }
        Returns: undefined
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
    Enums: {},
  },
} as const
