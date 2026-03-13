export type CommandFeedbackReason =
  | 'didnt_work'
  | 'too_slow'
  | 'bad_results'
  | 'confusing';

export interface CommandFeedbackData {
  command: string;
  useful: boolean;
  reasons?: CommandFeedbackReason[];
}

/**
 * Mock submitCommandFeedback — logs to console.
 * Replace with: POST /api/command-feedback
 */
export async function submitCommandFeedback(data: CommandFeedbackData): Promise<void> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 400));
  console.log('[commandFeedback]', data);
}
