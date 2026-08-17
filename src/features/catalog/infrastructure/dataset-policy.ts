type RequiredDataset = {
  channels: readonly unknown[];
  streams: readonly unknown[];
};

export const assertRequiredDatasetAvailable = (dataset: RequiredDataset): void => {
  const missing = [
    dataset.channels.length === 0 ? "channels" : null,
    dataset.streams.length === 0 ? "streams" : null,
  ].filter((name): name is string => name !== null);

  if (missing.length > 0) {
    throw new Error(`Required iptv-org dataset unavailable: ${missing.join(", ")}`);
  }
};
