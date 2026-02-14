declare module 'react-to-print' {
    import * as React from 'react';

    export interface IReactToPrintProps {
        trigger?: () => React.ReactElement;
        content: () => React.ReactInstance | null;
        onBeforeGetContent?: () => void | Promise<any>;
        onAfterPrint?: () => void;
        onPrintError?: (errorLocation: string, error: Error) => void;
        removeAfterPrint?: boolean;
        pageStyle?: string | (() => string);
    }

    export function useReactToPrint(props: IReactToPrintProps): () => void;
}
