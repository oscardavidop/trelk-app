const USER_CONFIG_BASE = '/api/v1/ui/user/config';
const COMMAND_CONFIG_BASE = '/api/v1/ui/config/commands';

async function json<T = any>(url: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(opts.headers as Record<string, string> || {}),
    },
    ...opts,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any)?.message || `HTTP ${res.status}`);
  }

  return res.json();
}

export type CommandConfigMap = Record<string, Record<string, unknown>>;

export interface UserCommandConfig {
  commands: CommandConfigMap;
}

function normalizeUserConfig(data: any): UserCommandConfig {
  if (data?.commands && typeof data.commands === 'object') {
    return { commands: data.commands as CommandConfigMap };
  }

  if (data?.config?.commands && typeof data.config.commands === 'object') {
    return { commands: data.config.commands as CommandConfigMap };
  }

  return { commands: {} };
}

export async function fetchUserCommandConfig(): Promise<UserCommandConfig> {
  const data = await json<any>(USER_CONFIG_BASE);
  return normalizeUserConfig(data);
}

export async function patchCommandConfig(
  command: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await json(`${COMMAND_CONFIG_BASE}/${encodeURIComponent(command)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
