export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      companies: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      conductors: {
        Row: {
          created_at: string
          id: string
          nombre: string
          rut: string
          transportista_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nombre: string
          rut: string
          transportista_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nombre?: string
          rut?: string
          transportista_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'conductors_transportista_id_fkey'
            columns: ['transportista_id']
            isOneToOne: false
            referencedRelation: 'transportistas'
            referencedColumns: ['id']
          }
        ]
      }
      historical_monthly_totals: {
        Row: {
          company_id: string
          created_at: string
          entered_by: string | null
          id: string
          month: number
          notes: string | null
          total_carga: number
          total_movements: number
          updated_at: string
          year: number
        }
        Insert: {
          company_id: string
          created_at?: string
          entered_by?: string | null
          id?: string
          month: number
          notes?: string | null
          total_carga: number
          total_movements: number
          updated_at?: string
          year: number
        }
        Update: {
          company_id?: string
          created_at?: string
          entered_by?: string | null
          id?: string
          month?: number
          notes?: string | null
          total_carga?: number
          total_movements?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: 'historical_monthly_totals_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'historical_monthly_totals_entered_by_fkey'
            columns: ['entered_by']
            isOneToOne: false
            referencedRelation: 'operators'
            referencedColumns: ['id']
          }
        ]
      }
      operators: {
        Row: {
          active: boolean
          created_at: string
          email: string
          full_name: string
          id: string
          is_admin: boolean
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          full_name: string
          id: string
          is_admin?: boolean
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_admin?: boolean
        }
        Relationships: []
      }
      transportistas: {
        Row: {
          created_at: string
          id: string
          nombre: string
          rut: string
        }
        Insert: {
          created_at?: string
          id?: string
          nombre: string
          rut: string
        }
        Update: {
          created_at?: string
          id?: string
          nombre?: string
          rut?: string
        }
        Relationships: []
      }
      trucks: {
        Row: {
          company_id: string
          created_at: string
          id: string
          patente: string
          tara: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          patente: string
          tara: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          patente?: string
          tara?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'trucks_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          }
        ]
      }
      weighings: {
        Row: {
          carga: number
          company_id: string
          conductor: string
          created_at: string
          fecha: string
          hora: string
          id: string
          n_guia: string
          operator_id: string
          patente: string
          peso_bruto: number | null
          producto: string | null
          tara: number | null
          ticket_number: number
          transportista_id: string | null
          traslado: string | null
          updated_at: string
        }
        Insert: {
          carga: number
          company_id: string
          conductor: string
          created_at?: string
          fecha: string
          hora: string
          id?: string
          n_guia: string
          operator_id: string
          patente: string
          peso_bruto?: number | null
          producto?: string | null
          tara?: number | null
          ticket_number?: never
          transportista_id?: string | null
          traslado?: string | null
          updated_at?: string
        }
        Update: {
          carga?: number
          company_id?: string
          conductor?: string
          created_at?: string
          fecha?: string
          hora?: string
          id?: string
          n_guia?: string
          operator_id?: string
          patente?: string
          peso_bruto?: number | null
          producto?: string | null
          tara?: number | null
          ticket_number?: never
          transportista_id?: string | null
          traslado?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'weighings_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'weighings_operator_id_fkey'
            columns: ['operator_id']
            isOneToOne: false
            referencedRelation: 'operators'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'weighings_transportista_id_fkey'
            columns: ['transportista_id']
            isOneToOne: false
            referencedRelation: 'transportistas'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      v_daily_summary: {
        Row: {
          carga_total: number | null
          company_id: string | null
          fecha: string | null
          movimientos: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'weighings_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          }
        ]
      }
      v_monthly_summary: {
        Row: {
          carga_total: number | null
          company_id: string | null
          is_detailed: boolean | null
          month: number | null
          movimientos: number | null
          year: number | null
        }
        Relationships: []
      }
      v_monthly_summary_detailed: {
        Row: {
          carga_total: number | null
          company_id: string | null
          month: number | null
          movimientos: number | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'weighings_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Functions: {
      current_operator_is_active: { Args: never; Returns: boolean }
      current_operator_is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {}
  }
} as const
