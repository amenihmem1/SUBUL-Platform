import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { SubscriptionsService } from './src/subscriptions/subscriptions.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  // Get the service
  const subscriptionsService = app.get(SubscriptionsService);
  
  // onModuleInit has likely already run when context was created, but we can call it again just to be safe.
  console.log('Running onModuleInit manually...');
  await subscriptionsService.onModuleInit();
  console.log('Plans seeded successfully!');
  
  await app.close();
  process.exit(0);
}

bootstrap().catch(err => {
  console.error(err);
  process.exit(1);
});
