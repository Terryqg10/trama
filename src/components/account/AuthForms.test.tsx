import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { FormState } from '@/lib/auth/form-state';

const registerAction = vi.fn<(previous: FormState, formData: FormData) => Promise<FormState>>();

vi.mock('@/lib/auth/actions', () => ({
  registerAction: (previous: FormState, formData: FormData) => registerAction(previous, formData),
  loginAction: vi.fn(),
  recoverAction: vi.fn(),
  resetPasswordAction: vi.fn(),
}));

import { RegisterForm, ResetPasswordForm } from './AuthForms';

describe('RegisterForm (CA-06, con la acción simulada: no se envía correo)', () => {
  it('muestra el mensaje de éxito que devuelve la acción', async () => {
    registerAction.mockResolvedValueOnce({
      status: 'success',
      message: 'Te hemos enviado un correo para confirmar tu cuenta. Ábrelo para terminar el registro.',
    });
    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ana@example.test' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'contraseña-larga' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Te hemos enviado un correo');
    const formData = registerAction.mock.calls[0]?.[1];
    expect(formData?.get('email')).toBe('ana@example.test');
  });

  it('marca cada campo inválido y mantiene los valores no sensibles', async () => {
    registerAction.mockResolvedValueOnce({
      status: 'error',
      fieldErrors: { email: 'Introduce un email válido.' },
      values: { fullName: 'Ana', email: 'ana' },
    });
    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'contraseña-larga' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() => expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true'));
    expect(screen.getByText('Introduce un email válido.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveValue('ana');
    expect(screen.getByLabelText('Contraseña')).toHaveValue('');
  });
});

// CA-155 (T-123): indicador de fortaleza bajo la contraseña nueva, informativo y sin bloquear el envío.
describe('indicador de fortaleza (CA-155)', () => {
  const level = () => screen.getByTestId('password-strength').getAttribute('data-level');

  it('en el registro cambia al escribir y vuelve a vacío al reiniciar el formulario', () => {
    render(<RegisterForm />);
    expect(level()).toBe('vacio');
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'abc' } });
    expect(level()).toBe('debil');
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'abcdefg1' } });
    expect(level()).toBe('buena');
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'Una-Contraseña-Larga-2026!' } });
    expect(level()).toBe('fuerte');
    // React 19 vacía los campos tras una acción: el indicador no se queda con el nivel de un campo ya vacío.
    fireEvent.reset(screen.getByLabelText('Contraseña').closest('form') as HTMLFormElement);
    expect(level()).toBe('vacio');
  });

  it('con una contraseña débil el envío no se bloquea en el navegador (lo decide el servidor)', async () => {
    registerAction.mockResolvedValueOnce({ status: 'error', fieldErrors: { password: 'Contraseña débil: usa al menos 8 caracteres con letras y números.' } });
    render(<RegisterForm />);
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    await waitFor(() => expect(registerAction).toHaveBeenCalled());
  });

  it('en «Nueva contraseña» también aparece, bajo el primer campo', () => {
    render(<ResetPasswordForm />);
    expect(level()).toBe('vacio');
    fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'abcdefg1' } });
    expect(level()).toBe('buena');
    const field = screen.getByLabelText('Nueva contraseña');
    const indicator = screen.getByTestId('password-strength');
    expect(field.compareDocumentPosition(indicator) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByLabelText('Repite la contraseña').compareDocumentPosition(indicator) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
  });
});
