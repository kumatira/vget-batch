export const isRunOnLocal = (): boolean => {
    return process.env.RUN_ENV === undefined;
};

export const uniq = <T>(array: T[]): T[] => {
    return [...new Set(array)];
}