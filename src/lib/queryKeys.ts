export const queryKeys = {
  courses: ['courses'] as const,
  courseImpact: (id: string) => ['courses', id, 'impact'] as const,
  sessions: ['sessions'] as const,
  tasks: ['tasks'] as const,
  task: (id: string) => ['tasks', id] as const,
  attachments: (taskId: string) => ['tasks', taskId, 'attachments'] as const,
  taskAttachmentTotal: (id: string) => ['tasks', id, 'attachment-total'] as const,
}
