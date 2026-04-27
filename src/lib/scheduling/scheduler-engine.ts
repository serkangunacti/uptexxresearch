import { prisma } from "../db";
import { getDeduplicationStrategies } from "../env";

export interface ScheduleConfig {
  id: string;
  agentId: string;
  type: "SIMPLE" | "ADVANCED" | "CUSTOM";
  hour?: number | null;
  minute?: number | null;
  everyDays?: number | null;
  daysOfWeek: string[];
  timezone: string;
  startHour?: number | null;
  endHour?: number | null;
  isEnabled: boolean;
}

export interface WorkRule {
  id: string;
  scheduleId: string;
  name: string;
  description?: string | null;
  condition: "ALWAYS" | "BUSINESS_HOURS" | "WEEKDAYS_ONLY" | "WEEKENDS_ONLY" | "CUSTOM_HOURS";
  customStartHour?: number | null;
  customEndHour?: number | null;
  maxRunsPerDay?: number | null;
  minIntervalMins?: number | null;
  priority: number;
  isActive: boolean;
}

export class SchedulerEngine {
  async shouldAgentRun(agentId: string, now: Date = new Date()): Promise<{
    shouldRun: boolean;
    reason?: string;
    ruleId?: string;
  }> {
    try {
      // Get schedule config
      const schedule = await prisma.scheduleConfig.findUnique({
        where: { agentId },
        include: { rules: { where: { isActive: true }, orderBy: { priority: 'desc' } } }
      });

      if (!schedule || !schedule.isEnabled) {
        return { shouldRun: false, reason: "No active schedule" };
      }

      // Check if within schedule time window
      if (!this.isWithinScheduleWindow(schedule, now)) {
        return { shouldRun: false, reason: "Outside schedule window" };
      }

      // Check work rules
      for (const rule of schedule.rules) {
        const ruleResult = await this.evaluateWorkRule(rule, agentId, now);
        if (ruleResult.shouldRun) {
          return {
            shouldRun: true,
            reason: `Rule: ${rule.name}`,
            ruleId: rule.id
          };
        }
      }

      // Default behavior: check last run time
      const lastRun = await prisma.agentRun.findFirst({
        where: { agentId },
        orderBy: { createdAt: 'desc' }
      });

      if (!lastRun) {
        return { shouldRun: true, reason: "First run" };
      }

      const timeSinceLastRun = now.getTime() - lastRun.createdAt.getTime();
      const scheduleInterval = this.getScheduleInterval(schedule);

      if (timeSinceLastRun >= scheduleInterval) {
        return { shouldRun: true, reason: "Schedule interval elapsed" };
      }

      return { shouldRun: false, reason: "Too soon since last run" };

    } catch (error) {
      console.error(`Scheduler error for agent ${agentId}:`, error);
      return { shouldRun: false, reason: "Scheduler error" };
    }
  }

  async getNextScheduledRun(agentId: string, fromDate: Date = new Date()): Promise<Date | null> {
    const schedule = await prisma.scheduleConfig.findUnique({
      where: { agentId }
    });

    if (!schedule || !schedule.isEnabled) {
      return null;
    }

    // For now, return next interval based on last run
    const lastRun = await prisma.agentRun.findFirst({
      where: { agentId },
      orderBy: { createdAt: 'desc' }
    });

    const baseTime = lastRun ? lastRun.createdAt : fromDate;
    const interval = this.getScheduleInterval(schedule);

    return new Date(baseTime.getTime() + interval);
  }

  private isWithinScheduleWindow(schedule: ScheduleConfig, now: Date): boolean {
    // Check day of week
    if (schedule.daysOfWeek.length > 0) {
      const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
      if (!schedule.daysOfWeek.includes(dayOfWeek)) {
        return false;
      }
    }

    // Check time range
    if (schedule.startHour !== undefined && schedule.startHour !== null && schedule.endHour !== undefined && schedule.endHour !== null) {
      const currentHour = now.getHours();
      if (currentHour < schedule.startHour || currentHour >= schedule.endHour) {
        return false;
      }
    }

    return true;
  }

  private async evaluateWorkRule(
    rule: WorkRule,
    agentId: string,
    now: Date
  ): Promise<{ shouldRun: boolean; reason?: string }> {
    // Check condition
    const conditionMet = this.checkRuleCondition(rule, now);
    if (!conditionMet) {
      return { shouldRun: false, reason: "Condition not met" };
    }

    // Check max runs per day
    if (rule.maxRunsPerDay) {
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const runsToday = await prisma.agentRun.count({
        where: {
          agentId,
          createdAt: {
            gte: today,
            lt: tomorrow
          }
        }
      });

      if (runsToday >= rule.maxRunsPerDay) {
        return { shouldRun: false, reason: "Max runs per day exceeded" };
      }
    }

    // Check minimum interval
    if (rule.minIntervalMins) {
      const lastRun = await prisma.agentRun.findFirst({
        where: { agentId },
        orderBy: { createdAt: 'desc' }
      });

      if (lastRun) {
        const timeSinceLastRun = (now.getTime() - lastRun.createdAt.getTime()) / (1000 * 60);
        if (timeSinceLastRun < rule.minIntervalMins) {
          return { shouldRun: false, reason: "Minimum interval not elapsed" };
        }
      }
    }

    return { shouldRun: true };
  }

  private checkRuleCondition(rule: WorkRule, now: Date): boolean {
    const hour = now.getHours();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

    switch (rule.condition) {
      case "ALWAYS":
        return true;

      case "BUSINESS_HOURS":
        return dayOfWeek >= 1 && dayOfWeek <= 5 && hour >= 9 && hour < 17;

      case "WEEKDAYS_ONLY":
        return dayOfWeek >= 1 && dayOfWeek <= 5;

      case "WEEKENDS_ONLY":
        return dayOfWeek === 0 || dayOfWeek === 6;

      case "CUSTOM_HOURS":
        if (rule.customStartHour === undefined || rule.customStartHour === null || rule.customEndHour === undefined || rule.customEndHour === null) {
          return false;
        }
        return hour >= rule.customStartHour && hour < rule.customEndHour;

      default:
        return false;
    }
  }

  private getScheduleInterval(schedule: ScheduleConfig): number {
    if (schedule.everyDays) {
      return schedule.everyDays * 24 * 60 * 60 * 1000; // days to milliseconds
    }

    // Default to 1 day
    return 24 * 60 * 60 * 1000;
  }

  async recordExecution(
    agentId: string,
    scheduledFor: Date,
    executedAt: Date,
    reason: string,
    ruleId?: string,
    status: string = "executed",
    skipReason?: string
  ) {
    await prisma.scheduleExecution.create({
      data: {
        agentId,
        scheduledFor,
        executedAt,
        reason,
        ruleId,
        status,
        skipReason
      }
    });
  }
}

export const schedulerEngine = new SchedulerEngine();