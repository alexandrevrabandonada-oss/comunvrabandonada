export interface OralHistoryTranscriptionProvider {
  submitTranscriptionJob(input: { oralHistoryItemId: string; text: string; language?: string }): Promise<{ jobId: string }>;
  getTranscriptionStatus(jobId: string): Promise<'completed' | 'cancelled'>;
  fetchTranscript(jobId: string): Promise<string>;
  cancelTranscription(jobId: string): Promise<void>;
}

export class ManualTranscriptionProvider implements OralHistoryTranscriptionProvider {
  private jobs = new Map<string, { text: string; cancelled: boolean }>();
  async submitTranscriptionJob(input: { oralHistoryItemId: string; text: string }) {
    const jobId = `manual:${input.oralHistoryItemId}:${crypto.randomUUID()}`;
    this.jobs.set(jobId, { text: input.text, cancelled: false });
    return { jobId };
  }
  async getTranscriptionStatus(jobId: string) { return this.jobs.get(jobId)?.cancelled ? 'cancelled' as const : 'completed' as const; }
  async fetchTranscript(jobId: string) { const job = this.jobs.get(jobId); if (!job || job.cancelled) throw new Error('Transcrição indisponível'); return job.text; }
  async cancelTranscription(jobId: string) { const job = this.jobs.get(jobId); if (job) job.cancelled = true; }
}
