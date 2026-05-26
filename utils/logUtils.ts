export const debug: boolean = false;

export function debugLog(level: string, ...args: any[]): void {
    if (debug) {
        console.log(`[${level}]`, ...args);
    }
};