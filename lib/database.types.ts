export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          provider: string;
          provider_id: string | null;
          email: string | null;
          nickname: string | null;
          profile_image: string | null;
          default_lang: 'ko' | 'en';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      verse_progress: {
        Row: {
          id: string;
          user_id: string;
          book_id: string;
          chapter: number;
          verse: number;
          language: 'ko' | 'en';
          total_lines: number;
          completed_lines: number[];
          fully_complete_at: string | null;
          rub_count: number;
          last_rub_at: string | null;
          last_updated: string;
        };
        Insert: Omit<Database['public']['Tables']['verse_progress']['Row'], 'id' | 'last_updated'>;
        Update: Partial<Database['public']['Tables']['verse_progress']['Insert']>;
      };
      groups: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          max_members: number;
          invite_code: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['groups']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['groups']['Insert']>;
      };
      group_members: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: Omit<Database['public']['Tables']['group_members']['Row'], 'id' | 'joined_at'>;
        Update: never;
      };
      group_reactions: {
        Row: {
          id: string;
          group_id: string;
          from_user: string;
          to_user: string;
          emoji: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['group_reactions']['Row'], 'id' | 'created_at'>;
        Update: never;
      };
      group_messages: {
        Row: {
          id: string;
          group_id: string;
          from_user: string;
          to_user: string | null;
          content: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['group_messages']['Row'], 'id' | 'created_at'>;
        Update: never;
      };
    };
    Views: {
      group_member_progress: {
        Row: {
          group_id: string;
          user_id: string;
          nickname: string | null;
          profile_image: string | null;
          completed_verses: number;
          progress_pct: number;
        };
      };
    };
  };
}
