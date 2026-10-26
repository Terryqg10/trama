import { describe, expect, it } from 'vitest';
import {
  addressSchema,
  fieldErrors,
  formDataToObject,
  loginSchema,
  nextPathSchema,
  recoverySchema,
  registerSchema,
  resetPasswordSchema,
} from './schemas';

const validAddress = {
  recipientName: 'Ana Pérez',
  line1: 'Calle Mayor 1',
  line2: '',
  postalCode: '28001',
  city: 'Madrid',
  province: 'Madrid',
};

describe('addressSchema (CA-08, test address-schema)', () => {
  it('acepta una dirección válida y normaliza line2 vacío a null', () => {
    const result = addressSchema.safeParse(validAddress);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.line2).toBeNull();
  });

  it('devuelve un error por cada campo inválido', () => {
    const result = addressSchema.safeParse({
      ...validAddress,
      recipientName: '',
      postalCode: '2800',
      city: '   ',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = fieldErrors(result.error);
      expect(Object.keys(errors).sort()).toEqual(['city', 'postalCode', 'recipientName']);
      expect(errors.postalCode).toBe('El código postal debe tener 5 dígitos.');
    }
  });

  it.each(['2800a', '280011', 'abcde', '28 01'])('rechaza el código postal %s', (postalCode) => {
    expect(addressSchema.safeParse({ ...validAddress, postalCode }).success).toBe(false);
  });

  it('rechaza campos que superan el límite del esquema de la BD', () => {
    expect(addressSchema.safeParse({ ...validAddress, line1: 'x'.repeat(201) }).success).toBe(false);
    expect(addressSchema.safeParse({ ...validAddress, city: 'x'.repeat(101) }).success).toBe(false);
  });

  it('trata un campo ausente como obligatorio', () => {
    const { city: _city, ...withoutCity } = validAddress;
    const result = addressSchema.safeParse(withoutCity);
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error).city).toBe('Este campo es obligatorio.');
  });
});

describe('registerSchema', () => {
  it('normaliza el email a minúsculas y sin espacios', () => {
    const result = registerSchema.safeParse({
      fullName: ' Ana ',
      email: '  Ana@Example.TEST ',
      password: 'contraseña-larga1',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('ana@example.test');
      expect(result.data.fullName).toBe('Ana');
    }
  });

  it('rechaza contraseñas cortas o de más de 72 caracteres', () => {
    const base = { fullName: 'Ana', email: 'ana@example.test' };
    expect(registerSchema.safeParse({ ...base, password: '1234567' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: 'x'.repeat(73) }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: 'x'.repeat(71) + '1' }).success).toBe(true);
  });

  it('rechaza emails mal formados', () => {
    const result = registerSchema.safeParse({ fullName: 'Ana', email: 'ana', password: 'contraseña-larga1' });
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error).email).toBe('Introduce un email válido.');
  });
});

// CA-154 (T-122, invariante I10): la contraseña nueva se valida con `validatePassword` del OS; el acceso no cambia.
describe('fortaleza de la contraseña nueva (CA-154)', () => {
  const base = { fullName: 'Ana', email: 'ana@example.test' };

  it.each(['12345678', 'solo-letras-sin-numeros', '        ', 'abc12'])('rechaza la contraseña débil %j con el mensaje del OS o el de longitud', (password) => {
    const result = registerSchema.safeParse({ ...base, password });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrors(result.error).password).toMatch(/^(Contraseña débil: usa al menos 8 caracteres con letras y números\.|La contraseña debe tener al menos 8 caracteres\.)$/);
    }
  });

  it('una contraseña de 8 o más con solo dígitos o solo letras dice cómo mejorarla', () => {
    for (const password of ['123456789012', 'abcdefghijkl']) {
      const result = registerSchema.safeParse({ ...base, password });
      expect(result.success).toBe(false);
      if (!result.success) expect(fieldErrors(result.error).password).toBe('Contraseña débil: usa al menos 8 caracteres con letras y números.');
    }
  });

  it.each(['abcdefg1', 'Contraseña2026', 'Una-Contraseña-Larga-2026!'])('acepta la contraseña %j (buena o fuerte)', (password) => {
    expect(registerSchema.safeParse({ ...base, password }).success).toBe(true);
    expect(resetPasswordSchema.safeParse({ password, confirm: password }).success).toBe(true);
  });

  it('el restablecimiento también rechaza una contraseña débil y marca el campo password', () => {
    const result = resetPasswordSchema.safeParse({ password: 'sinnumeros', confirm: 'sinnumeros' });
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error).password).toBe('Contraseña débil: usa al menos 8 caracteres con letras y números.');
  });

  it('el acceso no cambia: una contraseña débil de una cuenta existente sigue siendo válida para entrar', () => {
    expect(loginSchema.safeParse({ email: 'ana@example.test', password: '123' }).success).toBe(true);
  });
});

describe('loginSchema y recoverySchema', () => {
  it('login no impone reglas de formato a la contraseña, solo que exista', () => {
    expect(loginSchema.safeParse({ email: 'ana@example.test', password: 'x' }).success).toBe(true);
    expect(loginSchema.safeParse({ email: 'ana@example.test', password: '' }).success).toBe(false);
  });

  it('recuperación solo pide un email válido', () => {
    expect(recoverySchema.safeParse({ email: 'ana@example.test' }).success).toBe(true);
    expect(recoverySchema.safeParse({ email: 'no-es-email' }).success).toBe(false);
  });
});

describe('resetPasswordSchema (CA-59)', () => {
  it('exige que ambas contraseñas coincidan y marca el campo confirm', () => {
    const result = resetPasswordSchema.safeParse({ password: 'contraseña-larga1', confirm: 'otra-distinta' });
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error).confirm).toBe('Las contraseñas no coinciden.');
  });

  it('acepta contraseñas válidas e iguales', () => {
    expect(
      resetPasswordSchema.safeParse({ password: 'contraseña-larga1', confirm: 'contraseña-larga1' }).success,
    ).toBe(true);
  });
});

describe('formDataToObject', () => {
  it('convierte textos y descarta archivos', () => {
    const formData = new FormData();
    formData.set('email', 'ana@example.test');
    formData.set('archivo', new File(['x'], 'x.txt'));
    expect(formDataToObject(formData)).toEqual({ email: 'ana@example.test' });
  });
});

describe('nextPathSchema (T-042, T-115)', () => {
  it('admite /checkout y la ficha con favorito=1, y nada más', () => {
    expect(nextPathSchema.safeParse('/checkout').success).toBe(true);
    expect(nextPathSchema.safeParse('/producto/polo-pique-basico?favorito=1').success).toBe(true);
    for (const listing of ['/hombre', '/mujer?categoria=polos&talla=M', '/novedades', '/ofertas', '/buscar?q=camisa%20azul']) {
      expect(nextPathSchema.safeParse(listing).success, listing).toBe(true);
    }
    for (const value of [
      'https://evil.example',
      '/hombre//evil.example',
      '/hombre?x=<script>',
      '/hombrex',
      '/cuenta?x=1',
      '//evil.example',
      '/producto/polo?favorito=1&x=2',
      '/producto/../admin?favorito=1',
      '/producto/Polo?favorito=1',
      '/producto/polo',
      '/admin',
      '',
    ]) {
      expect(nextPathSchema.safeParse(value).success, value).toBe(false);
    }
  });
});
