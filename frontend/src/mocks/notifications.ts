export type NotificationType = 'achievement' | 'command' | 'subscription' | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: Date;
  read: boolean;
  link?: string;
}

export const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'achievement',
    title: 'Achievement unlocked',
    message: 'First 10 commands',
    createdAt: new Date(Date.now() - 1000 * 60 * 5),
    read: false,
  },
  {
    id: '2',
    type: 'command',
    title: 'New command available',
    message: '/aiimage v2',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    read: false,
  },
  {
    id: '3',
    type: 'subscription',
    title: 'Subscription expiring',
    message: 'Your Pro plan expires in 3 days',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    read: false,
  },
  {
    id: '4',
    type: 'system',
    title: 'Weekly stats ready',
    message: 'You ran 47 commands this week',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    read: true,
  },
  {
    id: '5',
    type: 'achievement',
    title: 'Achievement unlocked',
    message: 'Speed runner — 10 commands in 1 minute',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    read: true,
  },
];
