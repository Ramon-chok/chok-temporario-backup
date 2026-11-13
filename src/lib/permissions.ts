// Utilitário para validação de permissões de perfil nas APIs
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type Perfil = 'admin' | 'gerencia' | 'supervisor' | 'vendedor'

/**
 * Valida se o usuário tem permissão para acessar determinado recurso.
 * @param usuario Nome do usuário
 * @param perfisPermitidos Perfis permitidos (array ou string)
 * @returns {Promise<boolean>} true se permitido
 */
export async function validarPermissao(usuario: string, perfisPermitidos: Perfil[] | Perfil): Promise<boolean> {
  if (!usuario) return false
  const { data, error } = await supabaseAdmin
    .from('usuarios')
    .select('perfil')
    .eq('usuario', usuario)
    .single()
  if (error || !data) return false
  const perfil = data.perfil as Perfil
  if (Array.isArray(perfisPermitidos)) {
    return perfisPermitidos.includes(perfil)
  }
  return perfil === perfisPermitidos
}export type UserProfile = 'vendedor' | 'supervisor' | 'gerencia' | 'admin'

export interface Permissions {
  canViewAllData: boolean
  canViewTeamData: boolean
  canViewOwnData: boolean
  canManageUsers: boolean
  canManageSystem: boolean
}

/**
 * Retorna as permissões baseado no perfil do usuário
 */
export function getPermissionsByProfile(profile: UserProfile): Permissions {
  switch (profile) {
    case 'admin':
      return {
        canViewAllData: true,
        canViewTeamData: true,
        canViewOwnData: true,
        canManageUsers: true,
        canManageSystem: true,
      }
    
    case 'gerencia':
      return {
        canViewAllData: true,
        canViewTeamData: true,
        canViewOwnData: true,
        canManageUsers: false,
        canManageSystem: false,
      }
    
    case 'supervisor':
      return {
        canViewAllData: false,
        canViewTeamData: true,
        canViewOwnData: true,
        canManageUsers: false,
        canManageSystem: false,
      }
    
    case 'vendedor':
      return {
        canViewAllData: false,
        canViewTeamData: false,
        canViewOwnData: true,
        canManageUsers: false,
        canManageSystem: false,
      }
  }
}

/**
 * Tipo de filtro para queries
 */
export interface DataFilter {
  userProfile: UserProfile
  usuarioId?: string
  supervisorId?: string
  startDate?: Date
  endDate?: Date
}
