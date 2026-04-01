/**
 * Utility to safely acquire and cache the VSCode API.
 * The VSCode API can only be acquired once per webview.
 */

let vscodeApi: any = null;

export function getVsCodeApi() {
    if (!vscodeApi) {
        if (typeof (window as any).acquireVsCodeApi === 'function') {
            vscodeApi = (window as any).acquireVsCodeApi();
        } else {
            // Fallback for development outside of VSCode
            vscodeApi = {
                postMessage: (message: any) => console.log('VSCode API not available, would post message:', message),
                setState: (state: any) => console.log('VSCode API not available, would set state:', state),
                getState: () => ({})
            };
        }
    }
    return vscodeApi;
}
