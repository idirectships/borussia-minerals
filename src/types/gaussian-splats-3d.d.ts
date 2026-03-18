declare module "@mkkellogg/gaussian-splats-3d" {
  interface ViewerOptions {
    rootElement?: HTMLElement | null;
    selfDrivenMode?: boolean;
    useBuiltInControls?: boolean;
    sharedMemoryForWorkers?: boolean;
    ignoreDevicePixelRatio?: boolean;
  }

  interface LoadOptions {
    splatAlphaRemovalThreshold?: number;
    showLoadingUI?: boolean;
  }

  export class Viewer {
    constructor(options?: ViewerOptions);
    loadFile(path: string, options?: LoadOptions): Promise<void>;
    start(): void;
    dispose(): void;
  }
}
