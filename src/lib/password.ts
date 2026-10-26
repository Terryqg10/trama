import { z } from 'zod';

export type NivelPassword = 'debil' | 'buena' | 'fuerte';

export interface ResultadoPassword {
  nivel: NivelPassword;
  valida: boolean;
  mensaje: string;
}

const passwordSchema = z.string();

const MENSAJES: Record<NivelPassword, string> = {
  debil: 'Contraseña débil: usa al menos 8 caracteres con letras y números.',
  buena: 'Contraseña buena. Con 12 o más caracteres y símbolos sería fuerte.',
  fuerte: 'Contraseña fuerte.',
};

export function validatePassword(entrada: string): ResultadoPassword {
  const password = passwordSchema.parse(entrada);
  const tieneLetras = /\p{L}/u.test(password);
  const tieneNumeros = /\d/.test(password);
  const tieneMayusculas = /\p{Lu}/u.test(password);
  const tieneMinusculas = /\p{Ll}/u.test(password);
  const tieneSimbolos = /[^\p{L}\d\s]/u.test(password);

  let nivel: NivelPassword = 'debil';
  if (
    password.length >= 12 &&
    tieneMayusculas &&
    tieneMinusculas &&
    tieneNumeros &&
    tieneSimbolos
  ) {
    nivel = 'fuerte';
  } else if (password.length >= 8 && tieneLetras && tieneNumeros) {
    nivel = 'buena';
  }

  return { nivel, valida: nivel !== 'debil', mensaje: MENSAJES[nivel] };
}
