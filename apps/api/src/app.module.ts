import { Module } from '@nestjs/common';

import { PrismaModule } from './core/prisma.module.js';
import { AiAssistantModule } from './modules/ai-assistant/module.js';
import { AuthModule } from './modules/auth/module.js';
import { HistoryModule } from './modules/history/module.js';
import { ListsModule } from './modules/lists/module.js';
import { SubtasksModule } from './modules/subtasks/module.js';
import { TasksModule } from './modules/tasks/module.js';
import { UsersModule } from './modules/users/module.js';
import { AppController } from './app.controller.js';

@Module({
  imports: [PrismaModule, AuthModule, UsersModule, ListsModule, TasksModule, SubtasksModule, HistoryModule, AiAssistantModule],
  controllers: [AppController],
})
export class AppModule {}
