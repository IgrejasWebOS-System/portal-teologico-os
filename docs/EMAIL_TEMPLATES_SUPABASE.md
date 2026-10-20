# Modelos de e-mail do Supabase Auth (CETADP)

Criado em 20/10/2026. Objetivo: e-mails em português, com a marca do CETADP, e link que só é
consumido quando a pessoa clica em **Continuar** na página `/auth/callback` (filtros do Gmail
abriam o link antes e o token expirava).

Config de painel, **não vai por código/migration**. Fazer primeiro no projeto de **staging**,
testar, e só depois repetir em **produção** (`toduvwtzklntyptcodkf`).

## Como aplicar

1. Supabase → **Authentication → Emails → Templates** (em alguns painéis: *Email Templates*).
2. Para cada modelo abaixo: preencher **Subject** e colar o **Message body** (HTML).
3. Supabase → **Authentication → Providers → Email → Email OTP Expiration**: `86400` (24 h).
4. Conferir **Authentication → URL Configuration**: *Site URL* = endereço do ambiente
   (produção: `https://cetadp.teo.br`) e `…/auth/callback` na lista de *Redirect URLs*
   (já existe, pois os convites atuais funcionam).

> O link usa `{{ .RedirectTo }}` (o app já envia `…/auth/callback?next=/definir-senha`) seguido de
> `&token_hash={{ .TokenHash }}&type=…`. Não use `{{ .ConfirmationURL }}`: ele passa pelo
> endereço de verificação do Supabase e volta a ser consumido por filtros de e-mail.

---

## 1) Invite user (convite de aluno/professor)

**Subject:** `Seu acesso ao Portal CETADP`

```html
<div style="background:#f4f4f4;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
    <tr><td style="text-align:center;padding-bottom:8px;">
      <div style="font-size:20px;font-weight:bold;color:#111111;">Portal CETADP</div>
      <div style="font-size:13px;color:#666666;">Escola de Teologia</div>
    </td></tr>
    <tr><td style="font-size:15px;color:#222222;line-height:1.6;padding-top:16px;">
      <p>A paz do Senhor!</p>
      <p>Seu acesso ao <strong>Portal CETADP</strong> foi criado. Para ativar e criar sua senha, clique no botão abaixo.</p>
    </td></tr>
    <tr><td style="text-align:center;padding:20px 0;">
      <a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=invite" style="background:#CF8403;color:#000000;text-decoration:none;font-weight:bold;font-size:15px;padding:14px 28px;border-radius:8px;display:inline-block;">Ativar meu acesso</a>
    </td></tr>
    <tr><td style="font-size:13px;color:#555555;line-height:1.6;">
      <p>O link vale por 24 horas. Se o botão não abrir, copie e cole este endereço no navegador:</p>
      <p style="word-break:break-all;color:#0b5394;">{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=invite</p>
      <p>Se você não esperava este e-mail, pode ignorá-lo.</p>
    </td></tr>
    <tr><td style="border-top:1px solid #eeeeee;padding-top:16px;font-size:12px;color:#888888;text-align:center;">
      CETADP — mensagem automática, não responda este e-mail.
    </td></tr>
  </table>
</div>
```

## 2) Reset password (recuperar senha)

**Subject:** `Redefinir sua senha do Portal CETADP`

```html
<div style="background:#f4f4f4;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
    <tr><td style="text-align:center;padding-bottom:8px;">
      <div style="font-size:20px;font-weight:bold;color:#111111;">Portal CETADP</div>
      <div style="font-size:13px;color:#666666;">Escola de Teologia</div>
    </td></tr>
    <tr><td style="font-size:15px;color:#222222;line-height:1.6;padding-top:16px;">
      <p>Recebemos um pedido para redefinir a senha do seu acesso ao <strong>Portal CETADP</strong>.</p>
      <p>Clique no botão abaixo para criar uma nova senha.</p>
    </td></tr>
    <tr><td style="text-align:center;padding:20px 0;">
      <a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery" style="background:#CF8403;color:#000000;text-decoration:none;font-weight:bold;font-size:15px;padding:14px 28px;border-radius:8px;display:inline-block;">Criar nova senha</a>
    </td></tr>
    <tr><td style="font-size:13px;color:#555555;line-height:1.6;">
      <p>O link vale por 24 horas. Se o botão não abrir, copie e cole este endereço no navegador:</p>
      <p style="word-break:break-all;color:#0b5394;">{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery</p>
      <p>Se você não pediu a troca de senha, ignore este e-mail: sua senha atual continua valendo.</p>
    </td></tr>
    <tr><td style="border-top:1px solid #eeeeee;padding-top:16px;font-size:12px;color:#888888;text-align:center;">
      CETADP — mensagem automática, não responda este e-mail.
    </td></tr>
  </table>
</div>
```

## 3) Confirm signup (cadastro feito pela própria pessoa)

**Subject:** `Confirme seu cadastro no Portal CETADP`

```html
<div style="background:#f4f4f4;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
    <tr><td style="text-align:center;padding-bottom:8px;">
      <div style="font-size:20px;font-weight:bold;color:#111111;">Portal CETADP</div>
      <div style="font-size:13px;color:#666666;">Escola de Teologia</div>
    </td></tr>
    <tr><td style="font-size:15px;color:#222222;line-height:1.6;padding-top:16px;">
      <p>A paz do Senhor!</p>
      <p>Para concluir seu cadastro no <strong>Portal CETADP</strong>, confirme seu e-mail clicando no botão abaixo.</p>
    </td></tr>
    <tr><td style="text-align:center;padding:20px 0;">
      <a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=signup" style="background:#CF8403;color:#000000;text-decoration:none;font-weight:bold;font-size:15px;padding:14px 28px;border-radius:8px;display:inline-block;">Confirmar meu e-mail</a>
    </td></tr>
    <tr><td style="font-size:13px;color:#555555;line-height:1.6;">
      <p>O link vale por 24 horas. Se o botão não abrir, copie e cole este endereço no navegador:</p>
      <p style="word-break:break-all;color:#0b5394;">{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=signup</p>
      <p>Se você não fez este cadastro, pode ignorar este e-mail.</p>
    </td></tr>
    <tr><td style="border-top:1px solid #eeeeee;padding-top:16px;font-size:12px;color:#888888;text-align:center;">
      CETADP — mensagem automática, não responda este e-mail.
    </td></tr>
  </table>
</div>
```

---

## Como testar (staging)

1. Aplicar os 3 modelos no projeto de staging.
2. Pedir "Esqueci minha senha" para um e-mail seu → o e-mail chega em português → clicar no botão →
   a página mostra **Continuar** → clicar → abre `/definir-senha`.
3. Conferir o teste do filtro de e-mail: abrir o link e **não** clicar em Continuar; o link deve
   continuar válido depois (o token só é gasto no clique).
4. Só depois repetir os passos 1–3 do "Como aplicar" no projeto de **produção**.

## Pendências conhecidas

- Os outros modelos (Magic link, Change email, Reauthentication) continuam no padrão em inglês;
  o app não os usa hoje.
- O app envia `redirectTo` sempre com `?next=…`; por isso o modelo usa `&token_hash=`.
  Se algum dia um `redirectTo` for enviado sem `?`, o link quebra: manter o padrão.
