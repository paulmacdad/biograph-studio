declare module 'jstat' {
  export const jStat: {
    studentt: {
      cdf(value: number, degreesOfFreedom: number): number;
      inv(value: number, degreesOfFreedom: number): number;
    };
    centralF: {
      cdf(value: number, numeratorDegreesOfFreedom: number, denominatorDegreesOfFreedom: number): number;
    };
    normal: {
      cdf(value: number, mean: number, standardDeviation: number): number;
    };
    chisquare: {
      cdf(value: number, degreesOfFreedom: number): number;
    };
  };
}

interface ImportMetaEnv {
  readonly VITE_AI_ASSISTANT_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
