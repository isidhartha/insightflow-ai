export interface InsightFlowOptions {
  apiKey?: string;
  host?: string;
  batchSize?: number;
  flushInterval?: number;
  autoFlush?: boolean;
}

export interface CaptureProperties {
  [key: string]: string | number | boolean | null | undefined;
}

export declare class InsightFlowNode {
  constructor(options?: InsightFlowOptions);
  init(apiKey: string, host?: string): this;
  capture(event: string, properties?: CaptureProperties): this;
  identify(userId: string, traits?: CaptureProperties): this;
  page(name: string, properties?: CaptureProperties): this;
  flush(): Promise<this>;
  destroy(): Promise<this>;
}

export default InsightFlowNode;
