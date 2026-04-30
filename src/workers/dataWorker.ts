import { processDataset } from '../services/dataProcessor';

self.onmessage = (e: MessageEvent) => {
  const { name, rawData } = e.data;
  try {
    const result = processDataset(name, rawData);
    self.postMessage({ type: 'SUCCESS', result });
  } catch (error) {
    self.postMessage({ type: 'ERROR', error: error instanceof Error ? error.message : String(error) });
  }
};
