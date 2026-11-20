# Emails da Ração Certa (Supabase)

Em **Authentication › Emails › Templates**, substitui o assunto e o corpo destes dois modelos.
O `{{ .Token }}` é o código de 6 dígitos que a pessoa escreve na app. Não há links.

## Confirm signup

**Subject:** `O teu código da Ração Certa: {{ .Token }}`

**Body (Source):**
```html
<div style="font-family: -apple-system, Helvetica, Arial, sans-serif; color: #2E2A2A; max-width: 480px">
  <h2 style="color: #14345A">Confirma a tua conta</h2>
  <p>Escreve este código na app Ração Certa:</p>
  <p style="font-size: 34px; font-weight: 700; letter-spacing: 8px; color: #14345A; margin: 24px 0">{{ .Token }}</p>
  <p style="color: #6B5F5D; font-size: 14px">O código vale durante 1 hora. Se não foste tu a criar a conta, ignora este email.</p>
</div>
```

## Reset password

**Subject:** `Código para mudares a palavra-passe: {{ .Token }}`

**Body (Source):**
```html
<div style="font-family: -apple-system, Helvetica, Arial, sans-serif; color: #2E2A2A; max-width: 480px">
  <h2 style="color: #14345A">Mudar a palavra-passe</h2>
  <p>Escreve este código na app Ração Certa e escolhe a palavra-passe nova:</p>
  <p style="font-size: 34px; font-weight: 700; letter-spacing: 8px; color: #14345A; margin: 24px 0">{{ .Token }}</p>
  <p style="color: #6B5F5D; font-size: 14px">O código vale durante 1 hora. Se não pediste isto, ignora este email.</p>
</div>
```
