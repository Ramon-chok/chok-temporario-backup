// This file should be auto-generated from: https://supabase.com/docs/guides/api/rest/generating-types
// Run: npx supabase gen types typescript --project-id bqcyefcndtjhhrcggqad > src/types/supabase.ts

export interface Database {
  public: {
    Tables: {
      usuarios: {
        Row: {
          id: number
          usuario: string
          senha_hash: string | null
          perfil: 'vendedor' | 'supervisor' | 'gerencia' | 'admin'
          created_at: string
        }
        Insert: {
          usuario: string
          senha_hash?: string | null
          perfil: 'vendedor' | 'supervisor' | 'gerencia' | 'admin'
          id?: number
          created_at?: string
        }
        Update: {
          usuario?: string
          senha_hash?: string | null
          perfil?: 'vendedor' | 'supervisor' | 'gerencia' | 'admin'
          id?: number
          created_at?: string
        }
      }
      config: {
        Row: {
          key: string
          value: string | null
        }
        Insert: {
          key: string
          value?: string | null
        }
        Update: {
          key?: string
          value?: string | null
        }
      }
      notificacoes: {
        Row: {
          id: number
          user_id: string
          mensagem: string
          status: string
          chamado_id: number | null
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          mensagem: string
          status?: string
          chamado_id?: number | null
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          mensagem?: string
          status?: string
          chamado_id?: number | null
          created_at?: string
        }
      }
      notas_vendedor: {
        Row: {
          id: number
          usuario_codigo: string
          titulo: string
          conteudo: string
          mes_criacao: number
          ano_criacao: number
          criado_em: string
        }
        Insert: {
          id?: number
          usuario_codigo: string
          titulo: string
          conteudo: string
          mes_criacao: number
          ano_criacao: number
          criado_em?: string
        }
        Update: {
          id?: number
          usuario_codigo?: string
          titulo?: string
          conteudo?: string
          mes_criacao?: number
          ano_criacao?: number
          criado_em?: string
        }
      }
      page_logs: {
        Row: {
          id: number
          user_id: string | null
          user_email: string | null
          page_path: string
          page_name: string
          session_id: string
          duration_seconds: number
          created_at: string
        }
        Insert: {
          id?: number
          user_id?: string | null
          user_email?: string | null
          page_path: string
          page_name: string
          session_id: string
          duration_seconds?: number
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string | null
          user_email?: string | null
          page_path?: string
          page_name?: string
          session_id?: string
          duration_seconds?: number
          created_at?: string
        }
      }
      // Nome legado: hoje representa registros de faturamento importados do dados_app.
      ped_vda: {
        Row: {
          nu_ped: number
          dt_ped: string
          total: number
          cd_vend: string
          nm_vend: string
          cd_clie: string
          nm_clie: string
          cd_cat: string
          nm_cat: string
          cd_cid: string
          nm_cid: string
        }
        Insert: {
          nu_ped: number
          dt_ped: string
          total: number
          cd_vend: string
          nm_vend: string
          cd_clie: string
          nm_clie: string
          cd_cat?: string
          nm_cat?: string
          cd_cid?: string
          nm_cid?: string
        }
        Update: {
          nu_ped?: number
          dt_ped?: string
          total?: number
          cd_vend?: string
          nm_vend?: string
          cd_clie?: string
          nm_clie?: string
          cd_cat?: string
          nm_cat?: string
          cd_cid?: string
          nm_cid?: string
        }
      }
      // Nome legado: hoje representa detalhes de linhas importadas do dados_app.
      it_pedv: {
        Row: {
          nu_ped: number
          nu_item: number
          qtd: number
          vl_unit: number
          vl_venda: number
          vl_mg_brt: number | null
          cd_prod: string
          nm_prod: string
        }
        Insert: {
          nu_ped: number
          nu_item: number
          qtd: number
          vl_unit: number
          vl_venda: number
          vl_mg_brt?: number | null
          cd_prod: string
          nm_prod: string
        }
        Update: {
          nu_ped?: number
          nu_item?: number
          qtd?: number
          vl_unit?: number
          vl_venda?: number
          vl_mg_brt?: number | null
          cd_prod?: string
          nm_prod?: string
        }
      }
    }
    Views: {
      [_: string]: {
        Row: Record<string, unknown>
      }
    }
  }
}
