export type EpgStatus = "available" | "unavailable" | "stale" | "unknown";

export type EpgProgram = {
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
};

export type EpgDataSource = {
  id: string;
  name: string;
  kind: "fixture" | "remote";
};

export type EpgProviderResult = {
  programs: EpgProgram[];
  source: EpgDataSource;
  updatedAt: string;
};

export type EpgProviderContext = {
  signal: AbortSignal;
  now: Date;
};

export interface EpgProvider {
  readonly id: string;
  load(epgChannelId: string, context: EpgProviderContext): Promise<EpgProviderResult | null>;
}

export type EpgSchedule = {
  channelId: string;
  epgChannelId: string | null;
  currentProgram: EpgProgram | null;
  nextProgram: EpgProgram | null;
  source: EpgDataSource | null;
  updatedAt: string | null;
  status: EpgStatus;
  errorCode?: "timeout" | "provider_error" | "invalid_payload";
};

export type PublicEpgSource = Pick<EpgDataSource, "name" | "kind">;

/** Explicit allow-list projection used by public catalog and channel routes. */
export type PublicEpgSchedule = {
  currentProgram: EpgProgram | null;
  nextProgram: EpgProgram | null;
  source: PublicEpgSource | null;
  updatedAt: string | null;
  status: EpgStatus;
};
