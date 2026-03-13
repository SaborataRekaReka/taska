declare module 'node:http' {
  export interface IncomingMessage {
    method?: string;
    url?: string;
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
};
