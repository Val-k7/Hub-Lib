/**
 * Service d'envoi d'emails avec Nodemailer
 * Supporte SMTP, Gmail, SendGrid, etc.
 */

import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Types de templates d'emails
 */
export enum EmailTemplate {
  WELCOME = 'welcome',
  PASSWORD_RESET = 'password_reset',
  NOTIFICATION = 'notification',
  RESOURCE_SHARED = 'resource_shared',
  RESOURCE_COMMENT = 'resource_comment',
  SUGGESTION_APPROVED = 'suggestion_approved',
  SUGGESTION_REJECTED = 'suggestion_rejected',
}

/**
 * Données pour un email
 */
export interface EmailData {
  to: string;
  subject: string;
  template: EmailTemplate;
  data: Record<string, any>;
}

/**
 * Service d'envoi d'emails
 */
class EmailService {
  private transporter: Transporter | null = null;
  private isConfigured = false;

  /**
   * Initialise le transporteur email
   */
  constructor() {
    this.initializeTransporter();
  }

  /**
   * Initialise le transporteur selon la configuration
   */
  private initializeTransporter(): void {
    // Vérifier si l'email est configuré
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const smtpFrom = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@hub-lib.com';

    if (!smtpHost || !smtpUser || !smtpPassword) {
      logger.warn('⚠️  Service email non configuré. Les emails ne seront pas envoyés.');
      logger.warn('   Configurez SMTP_HOST, SMTP_USER, SMTP_PASSWORD dans .env');
      this.isConfigured = false;
      return;
    }

    try {
      const smtpPort = parseInt(process.env.SMTP_PORT || '587');
      const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;

      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
        // Options supplémentaires pour Gmail, SendGrid, etc.
        ...(process.env.SMTP_SERVICE && {
          service: process.env.SMTP_SERVICE,
        }),
      });

      this.isConfigured = true;
      logger.info('✅ Service email configuré', { host: smtpHost, port: smtpPort });
    } catch (error) {
      logger.error('❌ Erreur lors de la configuration du service email:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Vérifie la connexion SMTP
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      logger.info('✅ Connexion SMTP vérifiée');
      return true;
    } catch (error) {
      logger.error('❌ Erreur de vérification SMTP:', error);
      return false;
    }
  }

  /**
   * Génère le contenu HTML d'un email selon le template
   */
  private generateEmailContent(template: EmailTemplate, data: Record<string, any>): { html: string; text: string } {
    const baseUrl = env.API_BASE_URL.replace('/api', '');
    const appName = 'Hub-Lib';

    switch (template) {
      case EmailTemplate.WELCOME:
        return {
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Bienvenue sur ${appName} !</h1>
                </div>
                <div class="content">
                  <p>Bonjour ${data.name || data.username || 'utilisateur'},</p>
                  <p>Merci de vous être inscrit sur ${appName} ! Nous sommes ravis de vous accueillir.</p>
                  <p>Vous pouvez maintenant commencer à partager vos ressources et découvrir celles de la communauté.</p>
                  <a href="${baseUrl}" class="button">Commencer</a>
                  <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
                  <p>À bientôt,<br>L'équipe ${appName}</p>
                </div>
                <div class="footer">
                  <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
                </div>
              </div>
            </body>
            </html>
          `,
          text: `Bienvenue sur ${appName} !\n\nBonjour ${data.name || data.username || 'utilisateur'},\n\nMerci de vous être inscrit sur ${appName} ! Nous sommes ravis de vous accueillir.\n\nVous pouvez maintenant commencer à partager vos ressources et découvrir celles de la communauté.\n\nVisitez ${baseUrl} pour commencer.\n\nÀ bientôt,\nL'équipe ${appName}`,
        };

      case EmailTemplate.PASSWORD_RESET:
        return {
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .button { display: inline-block; padding: 12px 30px; background: #f5576c; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
                .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Réinitialisation de mot de passe</h1>
                </div>
                <div class="content">
                  <p>Bonjour,</p>
                  <p>Vous avez demandé à réinitialiser votre mot de passe sur ${appName}.</p>
                  <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
                  <a href="${data.resetUrl}" class="button">Réinitialiser mon mot de passe</a>
                  <div class="warning">
                    <strong>⚠️ Important :</strong> Ce lien est valide pendant 1 heure. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
                  </div>
                  <p>Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :</p>
                  <p style="word-break: break-all; color: #667eea;">${data.resetUrl}</p>
                  <p>À bientôt,<br>L'équipe ${appName}</p>
                </div>
                <div class="footer">
                  <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
                </div>
              </div>
            </body>
            </html>
          `,
          text: `Réinitialisation de mot de passe\n\nBonjour,\n\nVous avez demandé à réinitialiser votre mot de passe sur ${appName}.\n\nCliquez sur ce lien pour créer un nouveau mot de passe :\n${data.resetUrl}\n\n⚠️ Important : Ce lien est valide pendant 1 heure. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.\n\nÀ bientôt,\nL'équipe ${appName}`,
        };

      case EmailTemplate.NOTIFICATION:
        return {
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .button { display: inline-block; padding: 12px 30px; background: #4facfe; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>${data.title || 'Nouvelle notification'}</h1>
                </div>
                <div class="content">
                  <p>${data.message || 'Vous avez reçu une nouvelle notification.'}</p>
                  ${data.actionUrl ? `<a href="${data.actionUrl}" class="button">Voir</a>` : ''}
                  <p>À bientôt,<br>L'équipe ${appName}</p>
                </div>
                <div class="footer">
                  <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
                </div>
              </div>
            </body>
            </html>
          `,
          text: `${data.title || 'Nouvelle notification'}\n\n${data.message || 'Vous avez reçu une nouvelle notification.'}\n\n${data.actionUrl ? `Visitez : ${data.actionUrl}` : ''}\n\nÀ bientôt,\nL'équipe ${appName}`,
        };

      case EmailTemplate.RESOURCE_SHARED:
        return {
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .button { display: inline-block; padding: 12px 30px; background: #fa709a; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Ressource partagée avec vous</h1>
                </div>
                <div class="content">
                  <p>Bonjour,</p>
                  <p><strong>${data.sharerName || 'Un utilisateur'}</strong> a partagé la ressource <strong>"${data.resourceTitle || 'Ressource'}"</strong> avec vous.</p>
                  <p>${data.resourceDescription ? `Description : ${data.resourceDescription}` : ''}</p>
                  <a href="${data.resourceUrl}" class="button">Voir la ressource</a>
                  <p>À bientôt,<br>L'équipe ${appName}</p>
                </div>
                <div class="footer">
                  <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
                </div>
              </div>
            </body>
            </html>
          `,
          text: `Ressource partagée avec vous\n\nBonjour,\n\n${data.sharerName || 'Un utilisateur'} a partagé la ressource "${data.resourceTitle || 'Ressource'}" avec vous.\n\n${data.resourceDescription ? `Description : ${data.resourceDescription}\n\n` : ''}Visitez : ${data.resourceUrl}\n\nÀ bientôt,\nL'équipe ${appName}`,
        };

      case EmailTemplate.RESOURCE_COMMENT:
        return {
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #30cfd0 0%, #330867 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .button { display: inline-block; padding: 12px 30px; background: #30cfd0; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .comment { background: white; padding: 15px; border-left: 4px solid #30cfd0; margin: 20px 0; }
                .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Nouveau commentaire</h1>
                </div>
                <div class="content">
                  <p>Bonjour,</p>
                  <p><strong>${data.commenterName || 'Un utilisateur'}</strong> a commenté votre ressource <strong>"${data.resourceTitle || 'Ressource'}"</strong>.</p>
                  <div class="comment">
                    <p><strong>${data.commenterName || 'Utilisateur'}</strong> :</p>
                    <p>${data.comment || 'Nouveau commentaire'}</p>
                  </div>
                  <a href="${data.resourceUrl}" class="button">Voir le commentaire</a>
                  <p>À bientôt,<br>L'équipe ${appName}</p>
                </div>
                <div class="footer">
                  <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
                </div>
              </div>
            </body>
            </html>
          `,
          text: `Nouveau commentaire\n\nBonjour,\n\n${data.commenterName || 'Un utilisateur'} a commenté votre ressource "${data.resourceTitle || 'Ressource'}".\n\nCommentaire :\n${data.comment || 'Nouveau commentaire'}\n\nVisitez : ${data.resourceUrl}\n\nÀ bientôt,\nL'équipe ${appName}`,
        };

      case EmailTemplate.SUGGESTION_APPROVED:
        return {
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .button { display: inline-block; padding: 12px 30px; background: #84fab0; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>✅ Suggestion approuvée</h1>
                </div>
                <div class="content">
                  <p>Bonjour,</p>
                  <p>Félicitations ! Votre suggestion <strong>"${data.suggestionName || 'Suggestion'}"</strong> a été approuvée.</p>
                  <p>Elle est maintenant disponible dans la communauté.</p>
                  <a href="${data.suggestionUrl || baseUrl}" class="button">Voir la suggestion</a>
                  <p>Merci pour votre contribution !</p>
                  <p>À bientôt,<br>L'équipe ${appName}</p>
                </div>
                <div class="footer">
                  <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
                </div>
              </div>
            </body>
            </html>
          `,
          text: `Suggestion approuvée\n\nBonjour,\n\nFélicitations ! Votre suggestion "${data.suggestionName || 'Suggestion'}" a été approuvée.\n\nElle est maintenant disponible dans la communauté.\n\nVisitez : ${data.suggestionUrl || baseUrl}\n\nMerci pour votre contribution !\n\nÀ bientôt,\nL'équipe ${appName}`,
        };

      case EmailTemplate.SUGGESTION_REJECTED:
        return {
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Suggestion rejetée</h1>
                </div>
                <div class="content">
                  <p>Bonjour,</p>
                  <p>Votre suggestion <strong>"${data.suggestionName || 'Suggestion'}"</strong> a été rejetée.</p>
                  ${data.reason ? `<p><strong>Raison :</strong> ${data.reason}</p>` : ''}
                  <p>N'hésitez pas à soumettre d'autres suggestions !</p>
                  <p>À bientôt,<br>L'équipe ${appName}</p>
                </div>
                <div class="footer">
                  <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
                </div>
              </div>
            </body>
            </html>
          `,
          text: `Suggestion rejetée\n\nBonjour,\n\nVotre suggestion "${data.suggestionName || 'Suggestion'}" a été rejetée.\n\n${data.reason ? `Raison : ${data.reason}\n\n` : ''}N'hésitez pas à soumettre d'autres suggestions !\n\nÀ bientôt,\nL'équipe ${appName}`,
        };

      default:
        return {
          html: `<p>${data.message || 'Email'}</p>`,
          text: data.message || 'Email',
        };
    }
  }

  /**
   * Envoie un email
   */
  async sendEmail(emailData: EmailData): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      logger.warn(`Email non envoyé (service non configuré) : ${emailData.to} - ${emailData.subject}`);
      return false;
    }

    try {
      const { html, text } = this.generateEmailContent(emailData.template, emailData.data);
      const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@hub-lib.com';

      const info = await this.transporter.sendMail({
        from: `"Hub-Lib" <${from}>`,
        to: emailData.to,
        subject: emailData.subject,
        html,
        text,
      });

      logger.info(`✅ Email envoyé à ${emailData.to}`, {
        messageId: info.messageId,
        subject: emailData.subject,
      });

      return true;
    } catch (error) {
      logger.error(`❌ Erreur lors de l'envoi d'email à ${emailData.to}:`, error);
      return false;
    }
  }

  /**
   * Envoie un email de bienvenue
   */
  async sendWelcomeEmail(to: string, userData: { name?: string; username?: string }): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: 'Bienvenue sur Hub-Lib !',
      template: EmailTemplate.WELCOME,
      data: userData,
    });
  }

  /**
   * Envoie un email de réinitialisation de mot de passe
   */
  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: 'Réinitialisation de votre mot de passe',
      template: EmailTemplate.PASSWORD_RESET,
      data: { resetUrl },
    });
  }
}

// Export singleton
export const emailService = new EmailService();

