/**
 * Script para criar usuário admin no Supabase
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createAdminUser() {
  // Criando usuário admin...

  try {
    // Inserir ou atualizar usuário admin
    const { error } = await supabase
      .from('usuarios')
      .upsert({
        usuario: 'admin',
        senha_hash: 'admin123',
        perfil: 'admin'
      }, {
        onConflict: 'usuario'
      });

    if (error) throw error;

    // Usuário admin criado com sucesso!
    // Credenciais: Usuário: admin, Senha: admin123, Perfil: admin
    // Faça login em: http://localhost:3000/login
  } catch (error) {
    console.error('Erro ao criar usuario admin:', error?.message || error);
    process.exit(1);
  }
}

createAdminUser();
