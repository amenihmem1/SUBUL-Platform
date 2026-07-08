import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AuthService } from '../auth/auth.service';
import { UsersService } from '../users/users.service';

const adminEmail = 'abdelkhalek@smartovate.com';

const learnerEmails = [
  'jihed.ayari@esprit.tn',
  'mariem.saidi@smartovate.com',
  'lailaelkabrane@gmail.com',
  'Skander.Kammoun@esprit.tn',
  'onsbaccari132@gmail.com',
  'amenihmem9@gmail.com',
  'Jessem.BOUCHRIT@esprit.tn',
  'insaf.chaibi@smartovate.com',
  'onslengliz93@gmail.com',
  'ibtihelsalhi54@gmail.com',
  'nour.allani@smartovate.com',
  'ons.gharbi@smartovate.com',
  'ibtissem.ayachi@etudiant-enit.utm.tn',
  'trikihadil22@gmail.com',
  'mohamedali.ferchichi@smartovate.com',
  'saadallahamani94@gmail.com',
  'samar.elkamel@smartovate.com',
  'sirine.abdelkhalek@smartovate.com',
  'Rebhi.Montaha@esprit.tn',
  'nour.farhat@esprit.tn',
  'bouaicha.loujeyne@esprit.tn'
];

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  // Use AuthService to generate valid password reset tokens/emails
  const authService = app.get(AuthService);
  const usersService = app.get(UsersService);

  const emails = [adminEmail, ...learnerEmails];

  console.log(`Starting seeded user password reset broadcast to ${emails.length} recipients...`);

  let successCount = 0;
  let failCount = 0;
  let notFoundCount = 0;

  for (const email of emails) {
    try {
      const user = await usersService.findByEmail(email);
      if (!user) {
        console.warn(`[Warning] User NOT FOUND in database: ${email}`);
        notFoundCount++;
        continue;
      }

      console.log(`Sending password reset email to: ${email}`);
      await authService.forgotPasswordEmail(email);
      successCount++;
      // Wait to respect rate limits on Microsoft Graph
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Failed to send to ${email}:`, error);
      failCount++;
    }
  }

  console.log(`Broadcast complete. Success: ${successCount}, Failed: ${failCount}, Not Found: ${notFoundCount}`);

  await app.close();
}

bootstrap();
