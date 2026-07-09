import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/* ── Locale copy ── */
interface EmailCopy {
  greeting: string;
  verificationBody: string;
  verificationButton: string;
  verificationLinkLabel: string;
  verificationExpiry: string;
  resetBody: string;
  resetButton: string;
  resetLinkLabel: string;
  resetExpiry: string;
  resetExpiryExtra: string;
  footer: string;
  footerIgnore: string;
}

const COPY: Record<string, EmailCopy> = {
  en: {
    greeting: 'Hello,',
    verificationBody: 'Thank you for signing up on Subul Platform. Please confirm your email address by clicking the button below to activate your account.',
    verificationButton: 'Verify My Email Address',
    verificationLinkLabel: 'Or copy and paste this link into your browser',
    verificationExpiry: 'This link expires in 24 hours.',
    resetBody: 'We received a password reset request for your account. Click the button below to choose a new password.',
    resetButton: 'Reset My Password',
    resetLinkLabel: 'Or copy and paste this link into your browser',
    resetExpiry: 'This link expires in 24 hours.',
    resetExpiryExtra: 'If you did not make this request, you can safely ignore this email.',
    footer: 'All rights reserved.',
    footerIgnore: 'If you did not initiate this request, please ignore this email.',
  },
  fr: {
    greeting: 'Bonjour,',
    verificationBody: 'Merci de vous etre inscrit(e) sur Subul Platform. Veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous pour activer votre compte.',
    verificationButton: 'Verifier mon adresse email',
    verificationLinkLabel: 'Ou copiez et collez ce lien dans votre navigateur',
    verificationExpiry: 'Ce lien expire dans 24 heures.',
    resetBody: 'Nous avons recu une demande de reinitialisation de mot de passe pour votre compte. Cliquez ci-dessous pour choisir un nouveau mot de passe.',
    resetButton: 'Reinitialiser mon mot de passe',
    resetLinkLabel: 'Ou copiez et collez ce lien dans votre navigateur',
    resetExpiry: 'Ce lien expire dans 24 heures.',
    resetExpiryExtra: "Si vous n'avez pas fait cette demande, ignorez simplement cet email.",
    footer: 'Tous droits reserves.',
    footerIgnore: "Si vous n'etes pas a l'origine de cette demande, ignorez cet email.",
  },
};

function normalizeMailLocale(locale: string): 'en' | 'fr' {
  if (locale === 'fr') return 'fr';
  return 'en';
}

function copyFor(locale: string): EmailCopy {
  return COPY[normalizeMailLocale(locale)];
}

/* ── Brand Colors ── */
const PINK   = '#E8177D';
const PURPLE = '#8B1CC8';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;

  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly frontendUrl: string;
  private readonly emailVerificationLocale: string;

  constructor(private readonly config: ConfigService) {
    this.fromEmail  = config.get<string>('MAIL_FROM', 'subul@smartovate.com');
    this.fromName   = config.get<string>('MAIL_FROM_NAME', 'Subul Platform');
    this.frontendUrl = config
      .get<string>('FRONTEND_URL', 'http://localhost:3000')
      .replace(/\/+$/, '')
      .replace(/\/[a-z]{2}$/i, '');
    this.emailVerificationLocale = config.get<string>('EMAIL_VERIFICATION_LOCALE', 'en');

    const host   = config.get<string>('SMTP_HOST', 'email-smtp.eu-central-1.amazonaws.com');
    const portRaw = config.get<string | number>('SMTP_PORT', '587');
    const port   = typeof portRaw === 'number' && Number.isFinite(portRaw)
      ? portRaw
      : parseInt(String(portRaw ?? '587'), 10) || 587;
    const secure = config.get<string>('SMTP_SECURE', 'false') === 'true'; // true = TLS on 465; false = STARTTLS on 587
    const user   = config.get<string>('SMTP_USER', '');
    const pass   = config.get<string>('SMTP_PASS', '');

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: { minVersion: 'TLSv1.2' },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    });

    this.logger.log(`[Mail] SMTP transport → ${host}:${port} (secure=${secure})`);
    this.logger.log(`[Mail] From: ${this.fromName} <${this.fromEmail}>`);
    this.logger.log(`[Mail] Frontend URL: ${this.frontendUrl}`);

    if (!user || !pass) {
      this.logger.error('[Mail] SMTP_USER or SMTP_PASS is empty — all emails will fail');
    }
  }

  /* ═══════════════════════════════════════════════════════
   * CORE SEND — single reusable method for all outbound mail
   * ═══════════════════════════════════════════════════════ */
  private async sendMail(opts: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    const message = {
      from: `"${this.fromName}" <${this.fromEmail}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    };

    let lastErr: unknown;

    for (let attempt = 1; attempt <= 3; attempt++) {
      this.logger.log(`[Mail] Attempt ${attempt}/3 → ${opts.to} | "${opts.subject}"`);
      try {
        const info = await this.transporter.sendMail(message);
        this.logger.log(`[Mail] Sent → ${opts.to} | messageId: ${info.messageId} | response: ${info.response}`);
        return;
      } catch (err) {
        lastErr = err;
        const msg = err instanceof Error ? err.message : String(err);
        const smtp = err as { responseCode?: number; command?: string; response?: string };
        const smtpExtra =
          smtp.responseCode != null
            ? ` | SMTP ${smtp.responseCode}${smtp.command ? ` (${smtp.command})` : ''}${smtp.response ? ` — ${smtp.response}` : ''}`
            : '';
        this.logger.error(`[Mail] Attempt ${attempt} failed for ${opts.to}: ${msg}${smtpExtra}`);

        // Retry on transient errors; bail immediately on auth/config errors
        const isTransient = /ECONNRESET|ETIMEDOUT|ECONNREFUSED|421|450|451|452/i.test(msg);
        if (isTransient && attempt < 3) {
          await new Promise((r) => setTimeout(r, 1000 * attempt));
          continue;
        }
        break;
      }
    }

    const errMsg = lastErr instanceof Error ? lastErr.message : String(lastErr);
    this.logger.error(`[Mail] All attempts failed for ${opts.to}: ${errMsg}`);
    throw lastErr instanceof Error ? lastErr : new Error(errMsg);
  }

  /* ═══════════════════════════════════════════════════════
   * HTML TEMPLATE BUILDER
   * SES signs outbound mail with DKIM — full HTML is safe.
   * Uses inline styles only (no <style> blocks) for maximum
   * Gmail/Outlook compatibility.
   * ═══════════════════════════════════════════════════════ */
  private buildEmail(opts: {
    title: string;
    sections: string[];
    buttonText?: string;
    buttonUrl?: string;
    buttonColor?: string;
    fallbackUrl?: string;
    fallbackLabel?: string;
    footerLines: string[];
  }): string {
    const f = 'font-family:Arial,Helvetica,sans-serif;';
    const btnColor = opts.buttonColor || PINK;
    let body = '';

    // Header
    body += `<p style="${f}font-size:13px;font-weight:800;color:${PINK};letter-spacing:3px;text-align:center;margin:0 0 4px;">SUBUL</p>\n`;
    body += `<p style="${f}font-size:11px;font-weight:600;color:${PURPLE};letter-spacing:1px;text-align:center;margin:0 0 14px;text-transform:uppercase;">PLATFORM</p>\n`;
    body += `<p style="${f}font-size:22px;font-weight:bold;color:#1a1a1a;text-align:center;margin:0 0 6px;">${opts.title}</p>\n`;
    body += `<hr style="border:none;border-top:3px solid ${PINK};margin:14px auto 20px;width:48px;">\n`;

    // Content
    for (const section of opts.sections) {
      body += `<p style="${f}font-size:15px;line-height:1.7;color:#333333;margin:0 0 14px;">${section}</p>\n`;
    }

    // CTA Button
    if (opts.buttonText && opts.buttonUrl) {
      body += `<p style="text-align:center;margin:28px 0;">`
        + `<a href="${opts.buttonUrl}" target="_blank" `
        + `style="${f}font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;`
        + `padding:14px 40px;border-radius:8px;display:inline-block;background-color:${btnColor};">`
        + `${opts.buttonText}</a></p>\n`;
    }

    // Fallback link
    if (opts.fallbackUrl && opts.fallbackLabel) {
      body += `<p style="${f}font-size:12px;color:#888888;text-align:center;margin:0 0 4px;">${opts.fallbackLabel}:</p>\n`;
      body += `<p style="${f}font-size:12px;color:${PINK};word-break:break-all;text-align:center;margin:0 0 20px;">`
        + `<a href="${opts.fallbackUrl}" style="color:${PINK};">${opts.fallbackUrl}</a></p>\n`;
    }

    // Footer
    body += `<hr style="border:none;border-top:1px solid #ede8f5;margin:24px 0 14px;">\n`;
    for (const line of opts.footerLines) {
      body += `<p style="${f}font-size:11px;color:#9B8FB5;text-align:center;margin:0 0 4px;">${line}</p>\n`;
    }
    body += `<p style="${f}font-size:10px;color:${PURPLE};text-align:center;margin:10px 0 0;letter-spacing:1px;font-weight:700;">SUBUL PLATFORM</p>\n`;

    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f5f3fb;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:12px;padding:36px 32px;border:1px solid #ede8f5;">
    ${body}
  </div>
</body>
</html>`;
  }

  /** Plain-text counterpart for every HTML email (multipart/alternative) */
  private buildPlainText(opts: {
    title: string;
    greeting: string;
    body: string;
    ctaLabel: string;
    url: string;
    expiry: string;
    ignore: string;
  }): string {
    const year = new Date().getFullYear();
    return [
      '════════════════════════════════════════',
      '        S U B U L   P L A T F O R M',
      '════════════════════════════════════════',
      '',
      opts.title.toUpperCase(),
      '────────────────────────────────────────',
      '',
      opts.greeting,
      '',
      opts.body,
      '',
      `${opts.ctaLabel}:`,
      opts.url,
      '',
      `⏱  ${opts.expiry}`,
      '',
      opts.ignore,
      '',
      '════════════════════════════════════════',
      `© ${year} Subul Platform. All rights reserved.`,
      '════════════════════════════════════════',
    ].join('\n');
  }

  /** Detail block for HTML emails */
  private detailBlock(items: [string, string][]): string {
    return items.map(([k, v]) => `<strong>${k}:</strong> ${v}`).join('<br/>');
  }

  /** Minimal plain-text fallback when only HTML is provided (e.g. bulk). */
  private htmlToPlainText(html: string): string {
    return html
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 8000);
  }

  private subLabel(locale: string) {
    const is = (l: string) => locale === l;
    return {
      hello:        is('fr') ? 'Bonjour' : 'Hello',
      upgradeTitle: is('fr') ? 'Bienvenue sur votre nouveau plan' : 'Welcome to Your New Plan',
      upgradeBody:  is('fr')
        ? 'Votre abonnement a ete mis a jour vers {plan}. Votre acces est maintenant actif.'
        : 'Your subscription has been upgraded to {plan}. Your access is now active.',
      renewTitle:   is('fr') ? 'Abonnement renouvele' : 'Subscription Renewed',
      renewBody:    is('fr')
        ? 'Votre abonnement {plan} a ete renouvele avec succes.'
        : 'Your {plan} subscription has been renewed.',
      downTitle:    is('fr') ? 'Changement de plan' : 'Plan Change Confirmation',
      downBody:     is('fr')
        ? 'Votre abonnement a ete modifie de {old} vers {new}.'
        : 'Your subscription changed from {old} to {new}.',
      planLbl:      is('fr') ? 'Plan' : 'Plan',
      priceLbl:     is('fr') ? 'Prix' : 'Price',
      cycleLbl:     is('fr') ? 'Cycle' : 'Cycle',
      dateLbl:      is('fr') ? 'Date' : 'Date',
      amountLbl:    is('fr') ? 'Montant' : 'Amount',
      renewedLbl:   is('fr') ? 'Renouvele le' : 'Renewed',
      nextLbl:      is('fr') ? 'Prochaine facturation' : 'Next billing',
      fromLbl:      is('fr') ? 'De' : 'From',
      toLbl:        is('fr') ? 'Vers' : 'To',
      effectLbl:    is('fr') ? 'Effectif le' : 'Effective',
      dashBtn:      is('fr') ? 'Acceder au tableau de bord' : 'Go to Dashboard',
      thanks:       is('fr') ? 'Merci de votre confiance - Subul Platform' : 'Thank you for your trust - Subul Platform',
    };
  }

  /* ═══════════════════════════════════════════════════════
   * PUBLIC EMAIL METHODS
   * ═══════════════════════════════════════════════════════ */

  /* ── Email verification ── */
  async sendEmailVerification(email: string, token: string): Promise<void> {
    this.logger.log(`[Mail] sendEmailVerification → ${email}`);
    if (!email) throw new Error('sendEmailVerification: email is empty');
    if (!token) throw new Error('sendEmailVerification: token is empty');

    const locale = normalizeMailLocale(this.emailVerificationLocale);
    const c = copyFor(locale);
    const verifyUrl = `${this.frontendUrl}/${locale}/auth/verify-email?token=${encodeURIComponent(token)}`;


    const titleMap: Record<string, string> = {
      en: 'Confirm Your Email',
      fr: 'Confirmez votre email',
    };
    const subjectMap: Record<string, string> = {
      en: 'Verify your email - Subul Platform',
      fr: 'Verifiez votre email - Subul Platform',
    };
    const title = titleMap[locale] ?? titleMap.en;

    await this.sendMail({
      to: email,
      subject: subjectMap[locale] ?? subjectMap.en,
      html: this.buildEmail({
        title,
        sections: [c.greeting, c.verificationBody],
        buttonText: c.verificationButton,
        buttonUrl: verifyUrl,
        fallbackLabel: c.verificationLinkLabel,
        fallbackUrl: verifyUrl,
        footerLines: [c.verificationExpiry, c.footerIgnore, `© ${new Date().getFullYear()} Subul Platform. ${c.footer}`],
      }),
      text: this.buildPlainText({
        title,
        greeting: c.greeting,
        body: c.verificationBody,
        ctaLabel: c.verificationLinkLabel,
        url: verifyUrl,
        expiry: c.verificationExpiry,
        ignore: c.footerIgnore,
      }),
    });
  }

  /* ── Password reset ── */
  async sendPasswordReset(email: string, token: string): Promise<void> {
    this.logger.log(`[Mail] sendPasswordReset → ${email}`);
    if (!email) throw new Error('sendPasswordReset: email is empty');
    if (!token) throw new Error('sendPasswordReset: token is empty');

    const locale = normalizeMailLocale(this.emailVerificationLocale);
    const c = copyFor(locale);
    const resetUrl = `${this.frontendUrl}/${locale}/auth/reset-password/${encodeURIComponent(token)}`;


    const titleMap: Record<string, string> = {
      en: 'Reset Your Password',
      fr: 'Reinitialiser votre mot de passe',
    };
    const subjectMap: Record<string, string> = {
      en: 'Reset your password - Subul Platform',
      fr: 'Reinitialiser votre mot de passe - Subul Platform',
    };
    const title = titleMap[locale] ?? titleMap.en;

    await this.sendMail({
      to: email,
      subject: subjectMap[locale] ?? subjectMap.en,
      html: this.buildEmail({
        title,
        buttonColor: PURPLE,
        sections: [c.greeting, c.resetBody],
        buttonText: c.resetButton,
        buttonUrl: resetUrl,
        fallbackLabel: c.resetLinkLabel,
        fallbackUrl: resetUrl,
        footerLines: [c.resetExpiry, c.resetExpiryExtra, `© ${new Date().getFullYear()} Subul Platform. ${c.footer}`],
      }),
      text: this.buildPlainText({
        title,
        greeting: c.greeting,
        body: c.resetBody,
        ctaLabel: c.resetLinkLabel,
        url: resetUrl,
        expiry: c.resetExpiry,
        ignore: c.resetExpiryExtra,
      }),
    });
  }

  /* ── Bulk mail ── */
  async sendBulkMail(emails: string[], subject: string, html: string): Promise<void> {
    const text = this.htmlToPlainText(html) || 'This message is available in HTML format only.';
    for (const email of emails) {
      try {
        await this.sendMail({ to: email, subject, html, text });
        await new Promise((r) => setTimeout(r, 300));
      } catch (err) {
        this.logger.warn(`[Mail] Bulk: skipped ${email} — ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  /* ── Diagnostic ── */
  async sendTestDiagnostic(to: string): Promise<{ sent: boolean; timestamp: string; details: string }> {
    const timestamp = new Date().toISOString();
    this.logger.log(`[Mail] sendTestDiagnostic → ${to}`);
    try {
      await this.sendMail({
        to,
        subject: `Subul Diagnostic Test - ${timestamp}`,
        html: this.buildEmail({
          title: 'Diagnostic Test',
          sections: [
            'This is a diagnostic test email from Subul Platform.',
            `<strong>Timestamp:</strong> ${timestamp}`,
            'If you received this, the Amazon SES delivery pipeline is working correctly.',
          ],
          footerLines: ['Subul Platform — automated diagnostic'],
        }),
        text: `SUBUL PLATFORM — Diagnostic Test\n\nTimestamp: ${timestamp}\n\nIf you received this, the SES pipeline is working correctly.`,
      });
      return { sent: true, timestamp, details: `Test email sent to ${to}.` };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`[Mail] sendTestDiagnostic failed: ${msg}`);
      return { sent: false, timestamp, details: msg };
    }
  }

  /* ── Subscription Upgrade ── */
  async sendSubscriptionUpgrade(
    email: string, userName: string, planName: string,
    price: string, billingCycle: string, activationDate: string,
  ): Promise<void> {
    const locale = normalizeMailLocale(this.emailVerificationLocale);
    const L = this.subLabel(locale);
    const dashUrl = `${this.frontendUrl}/${locale}/dashboard/learner`;
    await this.sendMail({
      to: email,
      subject: `${planName} - Subul Platform`,
      html: this.buildEmail({
        title: L.upgradeTitle,
        sections: [
          `${L.hello} ${userName},`,
          L.upgradeBody.replace('{plan}', `<strong>${planName}</strong>`),
          this.detailBlock([[L.planLbl, planName], [L.priceLbl, price], [L.cycleLbl, billingCycle], [L.dateLbl, activationDate]]),
        ],
        buttonText: L.dashBtn,
        buttonUrl: dashUrl,
        footerLines: [L.thanks],
      }),
      text: `${L.hello} ${userName},\n\n${L.upgradeBody.replace('{plan}', planName)}\n\n${L.planLbl}: ${planName}\n${L.priceLbl}: ${price}\n${L.cycleLbl}: ${billingCycle}\n${L.dateLbl}: ${activationDate}\n\n${L.thanks}`,
    });
  }

  /* ── Subscription Renewal ── */
  async sendSubscriptionRenewal(
    email: string, userName: string, planName: string,
    price: string, renewalDate: string, nextBillingDate: string,
  ): Promise<void> {
    const locale = normalizeMailLocale(this.emailVerificationLocale);
    const L = this.subLabel(locale);
    const dashUrl = `${this.frontendUrl}/${locale}/dashboard/learner`;
    await this.sendMail({
      to: email,
      subject: `${planName} renewed - Subul Platform`,
      html: this.buildEmail({
        title: L.renewTitle,
        buttonColor: PURPLE,
        sections: [
          `${L.hello} ${userName},`,
          L.renewBody.replace('{plan}', `<strong>${planName}</strong>`),
          this.detailBlock([[L.planLbl, planName], [L.amountLbl, price], [L.renewedLbl, renewalDate], [L.nextLbl, nextBillingDate]]),
        ],
        buttonText: L.dashBtn,
        buttonUrl: dashUrl,
        footerLines: [L.thanks],
      }),
      text: `${L.hello} ${userName},\n\n${L.renewBody.replace('{plan}', planName)}\n\n${L.planLbl}: ${planName}\n${L.amountLbl}: ${price}\n${L.renewedLbl}: ${renewalDate}\n${L.nextLbl}: ${nextBillingDate}\n\n${L.thanks}`,
    });
  }

  /* ── Subscription Downgrade ── */
  async sendSubscriptionDowngrade(
    email: string, userName: string, oldPlanName: string,
    newPlanName: string, effectiveDate: string,
  ): Promise<void> {
    const locale = normalizeMailLocale(this.emailVerificationLocale);
    const L = this.subLabel(locale);
    const dashUrl = `${this.frontendUrl}/${locale}/dashboard/learner`;
    await this.sendMail({
      to: email,
      subject: `Plan changed - Subul Platform`,
      html: this.buildEmail({
        title: L.downTitle,
        sections: [
          `${L.hello} ${userName},`,
          L.downBody.replace('{old}', `<strong>${oldPlanName}</strong>`).replace('{new}', `<strong>${newPlanName}</strong>`),
          this.detailBlock([[L.fromLbl, oldPlanName], [L.toLbl, newPlanName], [L.effectLbl, effectiveDate]]),
        ],
        buttonText: L.dashBtn,
        buttonUrl: dashUrl,
        footerLines: [L.thanks],
      }),
      text: `${L.hello} ${userName},\n\n${L.downBody.replace('{old}', oldPlanName).replace('{new}', newPlanName)}\n\n${L.fromLbl}: ${oldPlanName}\n${L.toLbl}: ${newPlanName}\n${L.effectLbl}: ${effectiveDate}\n\n${L.thanks}`,
    });
  }

  /* ── Manual Payment: Proof Uploaded (to admin) ── */
  async sendManualPaymentProofUploaded(req: {
    orderId: string; userEmail: string | null; userFullName: string | null;
    planName: string; amountCents: number; currency: string; paymentMethod: string;
  }): Promise<void> {
    const adminEmail = this.config.get<string>('ADMIN_NOTIFICATION_EMAIL', this.fromEmail);
    if (!adminEmail) return;

    const divisor   = req.currency === 'TND' ? 1000 : 100;
    const amountFmt = `${(req.amountCents / divisor).toFixed(2)} ${req.currency}`;
    const method    = req.paymentMethod === 'bank_transfer' ? 'Virement bancaire' : 'D17';
    const adminUrl  = `${this.frontendUrl}/fr/dashboard/admin/manual-payments`;

    await this.sendMail({
      to: adminEmail,
      subject: `Preuve de paiement - ${req.orderId}`,
      html: this.buildEmail({
        title: 'Nouvelle preuve de paiement',
        buttonColor: PURPLE,
        sections: [
          'Un utilisateur a soumis une preuve de paiement qui necessite votre validation.',
          this.detailBlock([
            ['Reference', req.orderId],
            ['Utilisateur', `${req.userFullName ?? '-'} (${req.userEmail ?? '-'})`],
            ['Plan', req.planName],
            ['Montant', amountFmt],
            ['Methode', method],
          ]),
        ],
        buttonText: 'Valider dans le tableau de bord',
        buttonUrl: adminUrl,
        footerLines: ['Vous recevez cet email car vous etes administrateur de Subul Platform.'],
      }),
      text: `Nouvelle preuve de paiement\n\nReference: ${req.orderId}\nUtilisateur: ${req.userFullName} (${req.userEmail})\nPlan: ${req.planName}\nMontant: ${amountFmt}\nMethode: ${method}\n\nValidez sur: ${adminUrl}`,
    }).catch(err => this.logger.warn(`[Mail] sendManualPaymentProofUploaded failed: ${err?.message}`));
  }

  /* ── Manual Payment: Approved (to user) ── */
  async sendManualPaymentApproved(req: {
    userEmail: string | null; userFullName: string | null; orderId: string;
    planName: string; amountCents: number; currency: string;
  }, durationMonths: number): Promise<void> {
    if (!req.userEmail) return;

    const divisor   = req.currency === 'TND' ? 1000 : 100;
    const amountFmt = `${(req.amountCents / divisor).toFixed(2)} ${req.currency}`;
    const name      = req.userFullName || req.userEmail.split('@')[0];
    const locale    = normalizeMailLocale(this.emailVerificationLocale);
    const dashUrl   = `${this.frontendUrl}/${locale}/dashboard/learner`;
    const dateStr   = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

    await this.sendMail({
      to: req.userEmail,
      subject: `Abonnement ${req.planName} actif - Subul Platform`,
      html: this.buildEmail({
        title: 'Abonnement active',
        sections: [
          `Bonjour ${name},`,
          `Votre paiement a ete valide avec succes. Votre abonnement <strong>${req.planName}</strong> est maintenant actif.`,
          this.detailBlock([
            ['Reference', req.orderId], ['Plan', req.planName],
            ['Duree', `${durationMonths} mois`], ['Montant', amountFmt], ['Date', dateStr],
          ]),
        ],
        buttonText: 'Acceder a mon espace',
        buttonUrl: dashUrl,
        footerLines: ['Merci de votre confiance - Subul Platform'],
      }),
      text: `Bonjour ${name},\n\nVotre paiement a ete valide. Abonnement ${req.planName} actif.\n\nReference: ${req.orderId}\nDuree: ${durationMonths} mois\nMontant: ${amountFmt}\nDate: ${dateStr}\n\nAcceder: ${dashUrl}`,
    }).catch(err => this.logger.warn(`[Mail] sendManualPaymentApproved failed: ${err?.message}`));
  }

  /* ── University: workspace setup link ── */
  async sendUniversitySetup(to: string, opts: {
    universityName: string;
    setupLink: string;
    contactName?: string;
  }): Promise<void> {
    const name = opts.contactName || to.split('@')[0];
    await this.sendMail({
      to,
      subject: `Activate your ${opts.universityName} workspace on Subul`,
      html: this.buildEmail({
        title: `Welcome, ${name}!`,
        sections: [
          `You have been selected as the administrator of <strong>${opts.universityName}</strong> on Subul Platform.`,
          'Click the button below to set up your password and activate your university workspace.',
          '<strong>This link expires in 72 hours.</strong>',
        ],
        buttonText: 'Activate My Workspace',
        buttonUrl: opts.setupLink,
        fallbackUrl: opts.setupLink,
        fallbackLabel: 'Or copy and paste this link',
        footerLines: ['If you were not expecting this, you can safely ignore this email.'],
      }),
      text: `Hello ${name},\n\nActivate your ${opts.universityName} workspace on Subul:\n${opts.setupLink}\n\nThis link expires in 72 hours.`,
    }).catch(err => this.logger.warn(`[Mail] sendUniversitySetup failed: ${err?.message}`));
  }

  /* ── University: student / staff invite ── */
  async sendUniversityInvite(to: string, opts: {
    universityName: string;
    inviteLink: string;
    role: string;
  }): Promise<void> {
    const roleLabel = opts.role === 'student' ? 'student' : 'staff member';
    await this.sendMail({
      to,
      subject: `You've been invited to ${opts.universityName} on Subul`,
      html: this.buildEmail({
        title: 'You have been invited!',
        sections: [
          `You have been invited to join <strong>${opts.universityName}</strong> as a <strong>${roleLabel}</strong> on Subul Platform.`,
          'Click the button below to accept the invitation and access your courses.',
          '<strong>This invitation expires in 7 days.</strong>',
        ],
        buttonText: 'Accept Invitation',
        buttonUrl: opts.inviteLink,
        fallbackUrl: opts.inviteLink,
        fallbackLabel: 'Or copy and paste this link',
        footerLines: ['If you were not expecting this invitation, you can safely ignore this email.'],
      }),
      text: `You have been invited to ${opts.universityName} on Subul as ${roleLabel}.\n\nAccept: ${opts.inviteLink}\n\nExpires in 7 days.`,
    }).catch(err => this.logger.warn(`[Mail] sendUniversityInvite failed: ${err?.message}`));
  }

  /* ── Manual Payment: Rejected (to user) ── */
  async sendManualPaymentRejected(req: {
    userEmail: string | null; userFullName: string | null;
    orderId: string; planName: string; adminNotes: string | null;
  }): Promise<void> {
    if (!req.userEmail) return;

    const name     = req.userFullName || req.userEmail.split('@')[0];
    const locale   = normalizeMailLocale(this.emailVerificationLocale);
    const retryUrl = `${this.frontendUrl}/${locale}/dashboard/learner/payment-requests`;

    const sections: string[] = [
      `Bonjour ${name},`,
      `Votre demande de paiement pour le plan <strong>${req.planName}</strong> (ref: ${req.orderId}) n'a pas pu etre validee.`,
      ...(req.adminNotes ? [`<strong>Motif :</strong> ${req.adminNotes}`] : []),
      '<strong>Que faire maintenant :</strong><br/>'
        + '1. Verifiez que votre preuve de paiement est lisible et complete.<br/>'
        + '2. Soumettez une nouvelle preuve via votre espace.<br/>'
        + `3. Contactez-nous a ${this.fromEmail} si besoin.`,
    ];

    await this.sendMail({
      to: req.userEmail,
      subject: `Action requise - paiement ${req.orderId}`,
      html: this.buildEmail({
        title: 'Action requise',
        sections,
        buttonText: 'Soumettre une nouvelle preuve',
        buttonUrl: retryUrl,
        buttonColor: '#C62828',
        footerLines: ['Votre commande reste active. Vous pouvez soumettre une nouvelle preuve a tout moment.'],
      }),
      text: `Bonjour ${name},\n\nVotre paiement (ref: ${req.orderId}) n'a pas pu etre valide.${req.adminNotes ? `\nMotif: ${req.adminNotes}` : ''}\n\nSoumettez une nouvelle preuve: ${retryUrl}`,
    }).catch(err => this.logger.warn(`[Mail] sendManualPaymentRejected failed: ${err?.message}`));
  }

  /* ── Quote Request: New lead notification (to admin) ── */
  async sendQuoteRequestNotification(req: {
    requestId: string;
    name: string;
    email: string;
    phone: string | null;
    organization: string;
    numberOfUsers: number;
    planType: 'universite' | 'entreprise';
    message: string | null;
    createdAt: string;
  }): Promise<void> {
    const adminEmail = this.config.get<string>('ADMIN_NOTIFICATION_EMAIL', this.fromEmail);
    if (!adminEmail) return;

    const adminUrl = `${this.frontendUrl}/fr/dashboard/admin/devis/${encodeURIComponent(req.requestId)}`;
    const planLabel = req.planType === 'entreprise' ? 'Entreprise' : 'Universite';
    const sizeLabel =
      req.numberOfUsers >= 300 ? 'Strategic' :
      req.numberOfUsers >= 100 ? 'Large' :
      req.numberOfUsers >= 30 ? 'Mid-market' : 'SMB';

    await this.sendMail({
      to: adminEmail,
      subject: `[Devis] ${planLabel} - ${req.organization} (${req.numberOfUsers} users)`,
      html: this.buildEmail({
        title: 'Nouveau lead devis',
        buttonColor: PURPLE,
        sections: [
          'Une nouvelle demande de devis a ete soumise.',
          this.detailBlock([
            ['Reference', req.requestId],
            ['Plan', planLabel],
            ['Organisation', req.organization],
            ['Contact', `${req.name} (${req.email})`],
            ['Telephone', req.phone || '-'],
            ['Utilisateurs', String(req.numberOfUsers)],
            ['Segment', sizeLabel],
            ['Date', req.createdAt],
          ]),
          req.message ? `<strong>Besoins:</strong><br/>${req.message}` : '<strong>Besoins:</strong> -',
        ],
        buttonText: 'Ouvrir la demande',
        buttonUrl: adminUrl,
        footerLines: ['Notification automatique SUBUL devis pipeline.'],
      }),
      text:
        `Nouveau lead devis\n\n` +
        `Ref: ${req.requestId}\n` +
        `Plan: ${planLabel}\n` +
        `Organisation: ${req.organization}\n` +
        `Contact: ${req.name} (${req.email})\n` +
        `Telephone: ${req.phone || '-'}\n` +
        `Utilisateurs: ${req.numberOfUsers}\n` +
        `Date: ${req.createdAt}\n` +
        `${req.message ? `Besoins: ${req.message}\n` : ''}\n` +
        `Ouvrir: ${adminUrl}`,
    }).catch((err) => this.logger.warn(`[Mail] sendQuoteRequestNotification failed: ${err?.message}`));
  }
}
