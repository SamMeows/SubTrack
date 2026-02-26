/**
 * Supabase Database 타입 정의
 * supabase gen types로 자동 생성할 수 있으나 초기에는 수동 정의
 */
import type { Currency, ServiceDataSource, AlertType, AlertChannel } from './types';
import type { ServiceName, BillingType } from './constants';

export interface Database {
  public: {
    Tables: {
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          service_name: ServiceName;
          plan_name: string | null;
          login_email: string | null;
          payment_card_last4: string | null;
          card_nickname: string | null;
          billing_type: BillingType;
          monthly_cost: number | null;
          currency: Currency;
          billing_day: number | null;
          total_credits: number | null;
          remaining_credits: number | null;
          credit_unit: string | null;
          data_source: ServiceDataSource;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          service_name: ServiceName;
          plan_name?: string | null;
          login_email?: string | null;
          payment_card_last4?: string | null;
          card_nickname?: string | null;
          billing_type?: BillingType;
          monthly_cost?: number | null;
          currency?: Currency;
          billing_day?: number | null;
          total_credits?: number | null;
          remaining_credits?: number | null;
          credit_unit?: string | null;
          data_source?: ServiceDataSource;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          service_name?: ServiceName;
          plan_name?: string | null;
          login_email?: string | null;
          payment_card_last4?: string | null;
          card_nickname?: string | null;
          billing_type?: BillingType;
          monthly_cost?: number | null;
          currency?: Currency;
          billing_day?: number | null;
          total_credits?: number | null;
          remaining_credits?: number | null;
          credit_unit?: string | null;
          data_source?: ServiceDataSource;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'subscriptions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      credit_logs: {
        Row: {
          id: string;
          subscription_id: string;
          remaining_credits: number;
          used_credits: number;
          collected_at: string;
          source: ServiceDataSource;
        };
        Insert: {
          id?: string;
          subscription_id: string;
          remaining_credits: number;
          used_credits: number;
          collected_at?: string;
          source?: ServiceDataSource;
        };
        Update: {
          id?: string;
          subscription_id?: string;
          remaining_credits?: number;
          used_credits?: number;
          collected_at?: string;
          source?: ServiceDataSource;
        };
        Relationships: [
          {
            foreignKeyName: 'credit_logs_subscription_id_fkey';
            columns: ['subscription_id'];
            isOneToOne: false;
            referencedRelation: 'subscriptions';
            referencedColumns: ['id'];
          },
        ];
      };
      credit_grants: {
        Row: {
          id: string;
          subscription_id: string;
          grant_id: string | null;
          grant_amount: number;
          used_amount: number;
          remaining_amount: number;
          expires_at: string | null;
          effective_at: string | null;
          collected_at: string;
        };
        Insert: {
          id?: string;
          subscription_id: string;
          grant_id?: string | null;
          grant_amount: number;
          used_amount?: number;
          remaining_amount: number;
          expires_at?: string | null;
          effective_at?: string | null;
          collected_at?: string;
        };
        Update: {
          id?: string;
          subscription_id?: string;
          grant_id?: string | null;
          grant_amount?: number;
          used_amount?: number;
          remaining_amount?: number;
          expires_at?: string | null;
          effective_at?: string | null;
          collected_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'credit_grants_subscription_id_fkey';
            columns: ['subscription_id'];
            isOneToOne: false;
            referencedRelation: 'subscriptions';
            referencedColumns: ['id'];
          },
        ];
      };
      alerts: {
        Row: {
          id: string;
          user_id: string;
          subscription_id: string | null;
          type: AlertType;
          threshold: number | null;
          channel: AlertChannel;
          enabled: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subscription_id?: string | null;
          type: AlertType;
          threshold?: number | null;
          channel?: AlertChannel;
          enabled?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          subscription_id?: string | null;
          type?: AlertType;
          threshold?: number | null;
          channel?: AlertChannel;
          enabled?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'alerts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'alerts_subscription_id_fkey';
            columns: ['subscription_id'];
            isOneToOne: false;
            referencedRelation: 'subscriptions';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {};
    Functions: {};
  };
}
