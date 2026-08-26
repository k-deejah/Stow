import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SorobanService, SorobanRpcEvent } from './soroban.service';
import { SystemState } from './entities/system-state.entity';
import { SavingsProjectionService } from '../savings-projection/savings-projection.service';

const LAST_LEDGER_KEY = 'soroban:last_processed_ledger';

/**
 * Polls the Stow savings-vault contract for events and dispatches them to
 * the savings projections via the shared `SavingsProjectionService`.
 *
 * Ledger checkpointing gates re-delivery across polls: a ledger only
 * advances the checkpoint once every event up to it has been applied, and
 * each projection handler is itself idempotent (upsert-by-on-chain-id, or a
 * status flag guarding the state change), so a retried poll over a
 * partially-applied ledger range is safe.
 */
@Injectable()
export class SorobanListener {
  private readonly logger = new Logger(SorobanListener.name);
  private isPolling = false;

  constructor(
    private readonly sorobanService: SorobanService,
    private readonly savingsProjectionService: SavingsProjectionService,
    @InjectRepository(SystemState)
    private readonly systemStateRepository: Repository<SystemState>,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async pollEvents(): Promise<void> {
    const contractId = process.env.SOROBAN_CONTRACT_ID;
    if (!contractId || contractId === 'your-contract-id-here') {
      return; // Skip polling until the savings-vault contract is deployed.
    }
    if (this.isPolling) {
      this.logger.warn('Soroban listener skipped: previous poll still running');
      return;
    }
    this.isPolling = true;
    try {
      const lastProcessedLedger = await this.getLastProcessedLedger();
      const fromLedger = Math.max(lastProcessedLedger + 1, 1);

      const { events, latestLedger } =
        await this.sorobanService.getEvents(fromLedger);

      if (events.length === 0) {
        if (latestLedger > lastProcessedLedger) {
          await this.persistLastProcessedLedger(latestLedger);
        }
        return;
      }

      let maxProcessedLedger = lastProcessedLedger;
      const ordered = [...events].sort((a, b) => a.ledger - b.ledger);
      for (const event of ordered) {
        await this.processEvent(event);
        if (event.ledger > maxProcessedLedger) {
          maxProcessedLedger = event.ledger;
        }
      }
      await this.persistLastProcessedLedger(
        Math.max(maxProcessedLedger, latestLedger),
      );
    } catch (err) {
      this.logger.error('pollEvents failed', err as Error);
    } finally {
      this.isPolling = false;
    }
  }

  /** Decode and apply a single savings-vault event. */
  private async processEvent(event: SorobanRpcEvent): Promise<void> {
    const topic = event.topic[0];
    this.logger.debug(`event ${event.id} topic=${event.topic.join('.')}`);
    if (!topic) return;
    await this.savingsProjectionService.apply(topic, event.value ?? {});
  }

  private async getLastProcessedLedger(): Promise<number> {
    const row = await this.systemStateRepository.findOne({
      where: { key: LAST_LEDGER_KEY },
    });
    return row ? Number(row.value) : 0;
  }

  private async persistLastProcessedLedger(ledger: number): Promise<void> {
    await this.systemStateRepository.save({
      key: LAST_LEDGER_KEY,
      value: String(ledger),
    });
  }
}
