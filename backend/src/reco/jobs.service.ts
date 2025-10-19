import { Injectable } from '@nestjs/common';

type JobStatus = 'pending' | 'running' | 'completed' | 'failed';
export type JobRecord = {
  id: string;
  name: string;
  status: JobStatus;
  createdAt: number;
  updatedAt: number;
  error?: string;
};

@Injectable()
export class JobsService {
  private jobs = new Map<string, JobRecord>();

  create(name: string): JobRecord {
    const id = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    const now = Date.now();
    const rec: JobRecord = { id, name, status: 'pending', createdAt: now, updatedAt: now };
    this.jobs.set(id, rec);
    return rec;
  }

  setRunning(id: string) {
    const rec = this.jobs.get(id);
    if (!rec) return;
    rec.status = 'running';
    rec.updatedAt = Date.now();
    this.jobs.set(id, rec);
  }

  complete(id: string) {
    const rec = this.jobs.get(id);
    if (!rec) return;
    rec.status = 'completed';
    rec.updatedAt = Date.now();
    this.jobs.set(id, rec);
  }

  fail(id: string, error: string) {
    const rec = this.jobs.get(id);
    if (!rec) return;
    rec.status = 'failed';
    rec.error = error;
    rec.updatedAt = Date.now();
    this.jobs.set(id, rec);
  }

  get(id: string): JobRecord | undefined {
    return this.jobs.get(id);
  }
}

