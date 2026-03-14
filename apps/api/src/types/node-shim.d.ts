declare module 'node:http' {
  export interface IncomingMessage {
    method?: string;
    url?: string;
    headers: Record<string, string | string[] | undefined>;
    setEncoding(encoding: string): void;
    on(event: 'data', listener: (chunk: string) => void): this;
    on(event: 'end', listener: () => void): this;
    on(event: 'error', listener: (error: unknown) => void): this;
  }

  export interface ServerResponse {
    statusCode: number;
    setHeader(name: string, value: string): void;
    end(chunk?: string): void;
  }

  export function createServer(
    listener: (req: IncomingMessage, res: ServerResponse) => void,
  ): {
    listen(port: number, callback?: () => void): void;
  };
}

declare const process: {
  env: Record<string, string | undefined>;
  exit(code?: number): never;
};
