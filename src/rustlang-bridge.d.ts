
declare module 'rustlang-bridge' {
    import { ChildProcess } from 'child_process';
    import { EventEmitter } from "events";
    export default class RustBridge implements EventEmitter {
        constructor(executable_path: string);
        addListener(eventName: string | symbol, listener: (...args: any[]) => void): this;
        on(eventName: string | symbol, listener: (...args: any[]) => void): this;
        once(eventName: string | symbol, listener: (...args: any[]) => void): this;
        removeListener(eventName: string | symbol, listener: (...args: any[]) => void): this;
        off(eventName: string | symbol, listener: (...args: any[]) => void): this;
        removeAllListeners(event?: string | symbol | undefined): this;
        setMaxListeners(n: number): this;
        getMaxListeners(): number;
        listeners(eventName: string | symbol): Function[];
        rawListeners(eventName: string | symbol): Function[];
        emit(eventName: string | symbol, ...args: any[]): boolean;
        listenerCount(eventName: string | symbol): number;
        prependListener(eventName: string | symbol, listener: (...args: any[]) => void): this;
        prependOnceListener(eventName: string | symbol, listener: (...args: any[]) => void): this;
        eventNames(): (string | symbol)[];
        public ocr_drop(url: string): Promise<string>;
        public find_cards(cards: string): Promise<string>;
        public find_series(series: string): Promise<string>;
        public ocr_captcha(url: string): Promise<string>;
        public rust_process: ChildProcess;
        public close(): boolean;
    }
}