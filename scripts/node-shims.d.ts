declare module "node:fs" {
  export function existsSync(path: string): boolean;
  export function readFileSync(path: string): Uint8Array;
  export function readFileSync(path: string, encoding: "utf8"): string;
  export function statSync(path: string): { isFile(): boolean };
  export function writeFileSync(
    path: string,
    data: string,
    options?: { encoding?: string; flag?: string },
  ): void;
}

declare module "node:path" {
  export function resolve(...paths: string[]): string;
  export function relative(from: string, to: string): string;
}

declare module "node:crypto" {
  export function createHash(algorithm: string): {
    update(data: string | Uint8Array): { digest(encoding: "hex"): string };
    digest(encoding: "hex"): string;
  };
}

declare const process: {
  argv: string[];
  cwd(): string;
  exitCode?: number;
};
