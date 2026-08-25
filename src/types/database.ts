export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      achievement_unlocks: {
        Row: {
          achievement_id: string
          child_id: string
          id: string
          unlocked_at: string
        }
        Insert: {
          achievement_id: string
          child_id: string
          id?: string
          unlocked_at?: string
        }
        Update: {
          achievement_id?: string
          child_id?: string
          id?: string
          unlocked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievement_unlocks_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "achievement_unlocks_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "achievement_unlocks_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "v_child_balances"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "achievement_unlocks_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "v_child_gamification"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "achievement_unlocks_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "v_xp_ranking"
            referencedColumns: ["id"]
          },
        ]
      }
      achievements: {
        Row: {
          active: boolean
          code: string
          condition_type: string
          created_at: string
          description: string | null
          hidden: boolean
          icon: string
          id: string
          name: string
          points_reward: number
          product_id: string | null
          sort_order: number
          target_value: number
          xp_reward: number
        }
        Insert: {
          active?: boolean
          code: string
          condition_type: string
          created_at?: string
          description?: string | null
          hidden?: boolean
          icon?: string
          id?: string
          name: string
          points_reward?: number
          product_id?: string | null
          sort_order?: number
          target_value: number
          xp_reward?: number
        }
        Update: {
          active?: boolean
          code?: string
          condition_type?: string
          created_at?: string
          description?: string | null
          hidden?: boolean
          icon?: string
          id?: string
          name?: string
          points_reward?: number
          product_id?: string | null
          sort_order?: number
          target_value?: number
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "achievements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "achievements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "achievements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          celebrations: boolean
          currency: string
          family_name: string
          id: number
          low_stock_alerts: boolean
          protector_max: number
          timezone: string
          updated_at: string
        }
        Insert: {
          celebrations?: boolean
          currency?: string
          family_name?: string
          id?: number
          low_stock_alerts?: boolean
          protector_max?: number
          timezone?: string
          updated_at?: string
        }
        Update: {
          celebrations?: boolean
          currency?: string
          family_name?: string
          id?: number
          low_stock_alerts?: boolean
          protector_max?: number
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          active: boolean
          created_at: string
          emoji: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          emoji?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          emoji?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      challenge_progress: {
        Row: {
          challenge_id: string
          child_id: string
          completed_at: string | null
          current_value: number
          id: string
          rewarded: boolean
          updated_at: string
        }
        Insert: {
          challenge_id: string
          child_id: string
          completed_at?: string | null
          current_value?: number
          id?: string
          rewarded?: boolean
          updated_at?: string
        }
        Update: {
          challenge_id?: string
          child_id?: string
          completed_at?: string | null
          current_value?: number
          id?: string
          rewarded?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_progress_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_progress_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "v_child_balances"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "challenge_progress_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "v_child_gamification"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "challenge_progress_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "v_xp_ranking"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          condition_type: string
          created_at: string
          description: string | null
          ends_on: string
          icon: string
          id: string
          name: string
          points_reward: number
          product_id: string | null
          starts_on: string
          status: string
          target_value: number
          xp_reward: number
        }
        Insert: {
          condition_type: string
          created_at?: string
          description?: string | null
          ends_on: string
          icon?: string
          id?: string
          name: string
          points_reward?: number
          product_id?: string | null
          starts_on: string
          status?: string
          target_value: number
          xp_reward?: number
        }
        Update: {
          condition_type?: string
          created_at?: string
          description?: string | null
          ends_on?: string
          icon?: string
          id?: string
          name?: string
          points_reward?: number
          product_id?: string | null
          starts_on?: string
          status?: string
          target_value?: number
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "challenges_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock"
            referencedColumns: ["id"]
          },
        ]
      }
      child_settings: {
        Row: {
          auto_saving_enabled: boolean
          child_id: string
          saving_percent: number
          updated_at: string
        }
        Insert: {
          auto_saving_enabled?: boolean
          child_id: string
          saving_percent?: number
          updated_at?: string
        }
        Update: {
          auto_saving_enabled?: boolean
          child_id?: string
          saving_percent?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_settings_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_settings_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: true
            referencedRelation: "v_child_balances"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "child_settings_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: true
            referencedRelation: "v_child_gamification"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "child_settings_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: true
            referencedRelation: "v_xp_ranking"
            referencedColumns: ["id"]
          },
        ]
      }
      child_streaks: {
        Row: {
          best_streak: number
          child_id: string
          current_streak: number
          last_activity_date: string | null
          last_evaluated_date: string | null
          protectors_available: number
          updated_at: string
        }
        Insert: {
          best_streak?: number
          child_id: string
          current_streak?: number
          last_activity_date?: string | null
          last_evaluated_date?: string | null
          protectors_available?: number
          updated_at?: string
        }
        Update: {
          best_streak?: number
          child_id?: string
          current_streak?: number
          last_activity_date?: string | null
          last_evaluated_date?: string | null
          protectors_available?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_streaks_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_streaks_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: true
            referencedRelation: "v_child_balances"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "child_streaks_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: true
            referencedRelation: "v_child_gamification"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "child_streaks_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: true
            referencedRelation: "v_xp_ranking"
            referencedColumns: ["id"]
          },
        ]
      }
      earning_allocations: {
        Row: {
          child_id: string
          created_at: string
          id: string
          margin_amount: number
          reversed: boolean
          sale_id: string
          share_percent: number | null
          source: string
          tip_amount: number
          total_amount: number
        }
        Insert: {
          child_id: string
          created_at?: string
          id?: string
          margin_amount: number
          reversed?: boolean
          sale_id: string
          share_percent?: number | null
          source: string
          tip_amount?: number
          total_amount: number
        }
        Update: {
          child_id?: string
          created_at?: string
          id?: string
          margin_amount?: number
          reversed?: boolean
          sale_id?: string
          share_percent?: number | null
          source?: string
          tip_amount?: number
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "earning_allocations_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "earning_allocations_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "v_child_balances"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "earning_allocations_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "v_child_gamification"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "earning_allocations_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "v_xp_ranking"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "earning_allocations_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "earning_allocations_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "v_child_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      gamification_rules: {
        Row: {
          active: boolean
          event: string
          id: string
          points_amount: number
          updated_at: string
          xp_amount: number
        }
        Insert: {
          active?: boolean
          event: string
          id?: string
          points_amount?: number
          updated_at?: string
          xp_amount?: number
        }
        Update: {
          active?: boolean
          event?: string
          id?: string
          points_amount?: number
          updated_at?: string
          xp_amount?: number
        }
        Relationships: []
      }
      goals: {
        Row: {
          child_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          emoji: string
          id: string
          image_url: string | null
          is_primary: boolean
          name: string
          priority: number
          status: string
          target_amount: number
          target_date: string | null
          updated_at: string
        }
        Insert: {
          child_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          emoji?: string
          id?: string
          image_url?: string | null
          is_primary?: boolean
          name: string
          priority?: number
          status?: string
          target_amount: number
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          child_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          emoji?: string
          id?: string
          image_url?: string | null
          is_primary?: boolean
          name?: string
          priority?: number
          status?: string
          target_amount?: number
          target_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "v_child_balances"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "goals_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "v_child_gamification"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "goals_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "v_xp_ranking"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          created_by: string
          id: string
          local_date: string
          note: string | null
          product_id: string
          quantity_delta: number
          reason: string | null
          reference_id: string | null
          reference_type: string | null
          stock_after: number
          type: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          local_date: string
          note?: string | null
          product_id: string
          quantity_delta: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          stock_after: number
          type: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          local_date?: string
          note?: string | null
          product_id?: string
          quantity_delta?: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          stock_after?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_child_balances"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "inventory_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_child_gamification"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "inventory_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_xp_ranking"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock"
            referencedColumns: ["id"]
          },
        ]
      }
      levels: {
        Row: {
          active: boolean
          benefit: string | null
          description: string | null
          icon: string
          id: string
          name: string
          number: number
          xp_required: number
        }
        Insert: {
          active?: boolean
          benefit?: string | null
          description?: string | null
          icon?: string
          id?: string
          name: string
          number: number
          xp_required: number
        }
        Update: {
          active?: boolean
          benefit?: string | null
          description?: string | null
          icon?: string
          id?: string
          name?: string
          number?: number
          xp_required?: number
        }
        Relationships: []
      }
      money_movements: {
        Row: {
          available_delta: number
          child_id: string
          created_at: string
          created_by: string
          description: string
          earning_amount: number
          goal_delta: number
          goal_id: string | null
          id: string
          local_date: string
          reference_id: string | null
          reference_type: string | null
          savings_delta: number
          type: string
        }
        Insert: {
          available_delta?: number
          child_id: string
          created_at?: string
          created_by: string
          description: string
          earning_amount?: number
          goal_delta?: number
          goal_id?: string | null
          id?: string
          local_date: string
          reference_id?: string | null
          reference_type?: string | null
          savings_delta?: number
          type: string
        }
        Update: {
          available_delta?: number
          child_id?: string
          created_at?: string
          created_by?: string
          description?: string
          earning_amount?: number
          goal_delta?: number
          goal_id?: string | null
          id?: string
          local_date?: string
          reference_id?: string | null
          reference_type?: string | null
          savings_delta?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "money_movements_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "money_movements_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "v_child_balances"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "money_movements_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "v_child_gamification"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "money_movements_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "v_xp_ranking"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "money_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "money_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_child_balances"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "money_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_child_gamification"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "money_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_xp_ranking"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "money_movements_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "money_movements_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "v_goal_progress"
            referencedColumns: ["goal_id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          icon: string
          id: string
          profile_id: string
          read_at: string | null
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          icon?: string
          id?: string
          profile_id: string
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type: string
        }
        Update: {
          body?: string | null
          created_at?: string
          icon?: string
          id?: string
          profile_id?: string
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_child_balances"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_child_gamification"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_xp_ranking"
            referencedColumns: ["id"]
          },
        ]
      }
      point_movements: {
        Row: {
          amount: number
          child_id: string
          created_at: string
          description: string
          id: string
          reason: string
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          amount: number
          child_id: string
          created_at?: string
          description: string
          id?: string
          reason: string
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          amount?: number
          child_id?: string
          created_at?: string
          description?: string
          id?: string
          reason?: string
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "point_movements_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_movements_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "v_child_balances"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "point_movements_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "v_child_gamification"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "point_movements_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "v_xp_ranking"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          avg_cost: number
          category_id: string | null
          cost: number
          created_at: string
          description: string | null
          emoji: string
          id: string
          image_url: string | null
          min_stock: number
          name: string
          price: number
          sort_order: number
          stock: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          avg_cost?: number
          category_id?: string | null
          cost?: number
          created_at?: string
          description?: string | null
          emoji?: string
          id?: string
          image_url?: string | null
          min_stock?: number
          name: string
          price: number
          sort_order?: number
          stock?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          avg_cost?: number
          category_id?: string | null
          cost?: number
          created_at?: string
          description?: string | null
          emoji?: string
          id?: string
          image_url?: string | null
          min_stock?: number
          name?: string
          price?: number
          sort_order?: number
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          auth_email: string
          avatar_emoji: string
          color: string
          created_at: string
          id: string
          name: string
          pin_failed_attempts: number
          pin_locked_until: string | null
          sort_order: number
          type: string
        }
        Insert: {
          active?: boolean
          auth_email: string
          avatar_emoji?: string
          color?: string
          created_at?: string
          id: string
          name: string
          pin_failed_attempts?: number
          pin_locked_until?: string | null
          sort_order?: number
          type: string
        }
        Update: {
          active?: boolean
          auth_email?: string
          avatar_emoji?: string
          color?: string
          created_at?: string
          id?: string
          name?: string
          pin_failed_attempts?: number
          pin_locked_until?: string | null
          sort_order?: number
          type?: string
        }
        Relationships: []
      }
      profit_split_rules: {
        Row: {
          child_id: string
          percent: number
          updated_at: string
        }
        Insert: {
          child_id: string
          percent: number
          updated_at?: string
        }
        Update: {
          child_id?: string
          percent?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profit_split_rules_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profit_split_rules_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: true
            referencedRelation: "v_child_balances"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "profit_split_rules_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: true
            referencedRelation: "v_child_gamification"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "profit_split_rules_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: true
            referencedRelation: "v_xp_ranking"
            referencedColumns: ["id"]
          },
        ]
      }
      protector_events: {
        Row: {
          child_id: string
          created_at: string
          id: string
          local_date: string
          note: string | null
          points_spent: number
          quantity: number
          type: string
        }
        Insert: {
          child_id: string
          created_at?: string
          id?: string
          local_date: string
          note?: string | null
          points_spent?: number
          quantity?: number
          type: string
        }
        Update: {
          child_id?: string
          created_at?: string
          id?: string
          local_date?: string
          note?: string | null
          points_spent?: number
          quantity?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "protector_events_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protector_events_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "v_child_balances"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "protector_events_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "v_child_gamification"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "protector_events_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "v_xp_ranking"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          created_at: string
          created_by: string
          id: string
          local_date: string
          note: string | null
          product_id: string
          purchased_at: string
          quantity: number
          total_cost: number
          unit_cost: number
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          local_date: string
          note?: string | null
          product_id: string
          purchased_at?: string
          quantity: number
          total_cost: number
          unit_cost: number
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          local_date?: string
          note?: string | null
          product_id?: string
          purchased_at?: string
          quantity?: number
          total_cost?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_child_balances"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "purchases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_child_gamification"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "purchases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_xp_ranking"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock"
            referencedColumns: ["id"]
          },
        ]
      }
      redemptions: {
        Row: {
          child_id: string
          delivered_at: string | null
          id: string
          note: string | null
          points_spent: number
          redeemed_at: string
          reward_id: string
          reward_name: string
          status: string
        }
        Insert: {
          child_id: string
          delivered_at?: string | null
          id?: string
          note?: string | null
          points_spent: number
          redeemed_at?: string
          reward_id: string
          reward_name: string
          status?: string
        }
        Update: {
          child_id?: string
          delivered_at?: string | null
          id?: string
          note?: string | null
          points_spent?: number
          redeemed_at?: string
          reward_id?: string
          reward_name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "redemptions_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redemptions_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "v_child_balances"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "redemptions_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "v_child_gamification"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "redemptions_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "v_xp_ranking"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          active: boolean
          cost_points: number
          created_at: string
          description: string | null
          icon: string
          id: string
          image_url: string | null
          name: string
          sort_order: number
          stock: number | null
          type: string
        }
        Insert: {
          active?: boolean
          cost_points: number
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          image_url?: string | null
          name: string
          sort_order?: number
          stock?: number | null
          type?: string
        }
        Update: {
          active?: boolean
          cost_points?: number
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          image_url?: string | null
          name?: string
          sort_order?: number
          stock?: number | null
          type?: string
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          id: string
          line_cost: number
          line_margin: number
          line_total: number
          product_emoji: string
          product_id: string
          product_name: string
          quantity: number
          sale_id: string
          unit_cost: number
          unit_price: number
        }
        Insert: {
          id?: string
          line_cost: number
          line_margin: number
          line_total: number
          product_emoji?: string
          product_id: string
          product_name: string
          quantity: number
          sale_id: string
          unit_cost: number
          unit_price: number
        }
        Update: {
          id?: string
          line_cost?: number
          line_margin?: number
          line_total?: number
          product_emoji?: string
          product_id?: string
          product_name?: string
          quantity?: number
          sale_id?: string
          unit_cost?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "v_child_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          cash_received: number | null
          change_given: number | null
          cost_total: number
          created_at: string
          earnings_total: number
          id: string
          items_total: number
          local_date: string
          margin_total: number
          note: string | null
          payment_method: string
          seller_id: string
          seller_type: string
          sold_at: string
          status: string
          tip_total: number
          units_total: number
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          cash_received?: number | null
          change_given?: number | null
          cost_total?: number
          created_at?: string
          earnings_total: number
          id: string
          items_total: number
          local_date: string
          margin_total: number
          note?: string | null
          payment_method: string
          seller_id: string
          seller_type: string
          sold_at?: string
          status?: string
          tip_total?: number
          units_total: number
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          cash_received?: number | null
          change_given?: number | null
          cost_total?: number
          created_at?: string
          earnings_total?: number
          id?: string
          items_total?: number
          local_date?: string
          margin_total?: number
          note?: string | null
          payment_method?: string
          seller_id?: string
          seller_type?: string
          sold_at?: string
          status?: string
          tip_total?: number
          units_total?: number
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_child_balances"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "sales_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_child_gamification"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "sales_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_xp_ranking"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "v_child_balances"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "sales_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "v_child_gamification"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "sales_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "v_xp_ranking"
            referencedColumns: ["id"]
          },
        ]
      }
      streak_days: {
        Row: {
          child_id: string
          local_date: string
          sales_count: number
          status: string
        }
        Insert: {
          child_id: string
          local_date: string
          sales_count?: number
          status: string
        }
        Update: {
          child_id?: string
          local_date?: string
          sales_count?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "streak_days_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "streak_days_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "v_child_balances"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "streak_days_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "v_child_gamification"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "streak_days_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "v_xp_ranking"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_movements: {
        Row: {
          amount: number
          child_id: string
          created_at: string
          description: string
          id: string
          reason: string
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          amount: number
          child_id: string
          created_at?: string
          description: string
          id?: string
          reason: string
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          amount?: number
          child_id?: string
          created_at?: string
          description?: string
          id?: string
          reason?: string
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "xp_movements_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "xp_movements_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "v_child_balances"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "xp_movements_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "v_child_gamification"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "xp_movements_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "v_xp_ranking"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      products_public: {
        Row: {
          active: boolean | null
          category_id: string | null
          description: string | null
          emoji: string | null
          id: string | null
          image_url: string | null
          min_stock: number | null
          name: string | null
          price: number | null
          sort_order: number | null
          stock: number | null
        }
        Insert: {
          active?: boolean | null
          category_id?: string | null
          description?: string | null
          emoji?: string | null
          id?: string | null
          image_url?: string | null
          min_stock?: number | null
          name?: string | null
          price?: number | null
          sort_order?: number | null
          stock?: number | null
        }
        Update: {
          active?: boolean | null
          category_id?: string | null
          description?: string | null
          emoji?: string | null
          id?: string | null
          image_url?: string | null
          min_stock?: number | null
          name?: string | null
          price?: number | null
          sort_order?: number | null
          stock?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      v_child_balances: {
        Row: {
          available: number | null
          child_id: string | null
          historic_earnings: number | null
          in_goals: number | null
          savings: number | null
        }
        Relationships: []
      }
      v_child_gamification: {
        Row: {
          child_id: string | null
          points: number | null
          xp: number | null
        }
        Insert: {
          child_id?: string | null
          points?: never
          xp?: never
        }
        Update: {
          child_id?: string | null
          points?: never
          xp?: never
        }
        Relationships: []
      }
      v_child_sales: {
        Row: {
          child_earning: number | null
          child_id: string | null
          id: string | null
          items_total: number | null
          local_date: string | null
          payment_method: string | null
          seller_id: string | null
          sold_at: string | null
          source: string | null
          status: string | null
          tip_total: number | null
          units_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "earning_allocations_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "earning_allocations_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "v_child_balances"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "earning_allocations_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "v_child_gamification"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "earning_allocations_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "v_xp_ranking"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_child_balances"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "sales_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_child_gamification"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "sales_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_xp_ranking"
            referencedColumns: ["id"]
          },
        ]
      }
      v_goal_progress: {
        Row: {
          child_id: string | null
          goal_id: string | null
          percent: number | null
          saved_amount: number | null
          target_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "goals_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "v_child_balances"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "goals_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "v_child_gamification"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "goals_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "v_xp_ranking"
            referencedColumns: ["id"]
          },
        ]
      }
      v_low_stock: {
        Row: {
          emoji: string | null
          id: string | null
          min_stock: number | null
          name: string | null
          stock: number | null
        }
        Insert: {
          emoji?: string | null
          id?: string | null
          min_stock?: number | null
          name?: string | null
          stock?: number | null
        }
        Update: {
          emoji?: string | null
          id?: string | null
          min_stock?: number | null
          name?: string | null
          stock?: number | null
        }
        Relationships: []
      }
      v_xp_ranking: {
        Row: {
          avatar_emoji: string | null
          color: string | null
          id: string | null
          name: string | null
          xp: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      is_parent: { Args: never; Returns: boolean }
      purchase_commit: { Args: { p: Json }; Returns: undefined }
      redemption_update: { Args: { p: Json }; Returns: undefined }
      reward_redeem: { Args: { p: Json }; Returns: undefined }
      sale_commit: { Args: { p: Json }; Returns: undefined }
      sale_void: { Args: { p: Json }; Returns: undefined }
      streak_refresh: { Args: { p: Json }; Returns: undefined }
      streak_sync: { Args: { p: Json }; Returns: undefined }
      wallet_commit: { Args: { p: Json }; Returns: undefined }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
