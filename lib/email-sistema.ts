/** E-mail interno gerado pelo sistema (alinhado ao login Supabase Auth). */
export function emailSistemaFromMatricula(matricula: string): string {
  return `${matricula.trim()}@gaep.internal`
}
