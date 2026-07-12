import { el, $, toast } from '../utils.js';
import { signIn } from '../auth.js';
import { APP_NAME } from '../config.js';

export async function renderLogin(onSuccess) {
  const app = document.getElementById('app');
  app.innerHTML = '';

  const form = el('form', { class: 'login-form', onsubmit: handleSubmit }, [
    el('label', {}, 'Username or Email'),
    el('input', { id: 'login-id', type: 'text', required: 'true', autocomplete: 'username', placeholder: 'e.g. admin or you@company.com' }),
    el('label', {}, 'Password'),
    el('input', { id: 'login-pass', type: 'password', required: 'true', autocomplete: 'current-password', placeholder: '••••••••' }),
    el('button', { class: 'btn btn-primary btn-block', type: 'submit' }, 'Sign In'),
    el('p', { id: 'login-error', class: 'form-error' }, '')
  ]);

  const card = el('div', { class: 'login-card' }, [
    el('div', { class: 'login-brand' }, [el('span', { class: 'brand-mark-lg' }, '💳'), el('h1', {}, APP_NAME)]),
    el('p', { class: 'login-sub' }, 'Sign in to manage your merchant pipeline'),
    form
  ]);

  app.appendChild(el('div', { class: 'login-screen' }, card));

  async function handleSubmit(e) {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const errorNode = $('#login-error');
    errorNode.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Signing in…';
    try {
      await signIn($('#login-id').value, $('#login-pass').value);
      await onSuccess();
    } catch (err) {
      errorNode.textContent = err.message || 'Unable to sign in.';
      toast(err.message || 'Unable to sign in.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  }
}
