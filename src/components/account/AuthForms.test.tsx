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

import { RegisterForm } from './AuthForms';

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
