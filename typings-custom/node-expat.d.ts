declare module "node-expat" {
	import * as events from "events";

	export class Parser extends events.EventEmitter {
		constructor(encoding: string);

		parse(data: string | Buffer, isFinal: boolean): boolean;

		setEncoding(encoding: string): boolean;
		// setUnknownEncoding() TODO

		// getError() TODO

		stop(): boolean;
		// Same return value as stop().
		pause(): boolean;
		resume(): boolean;

		destroy(): void;
		destroySoon(): void;

		// Same data argument and return value as parse() but emits errors and isFinal is false.
		write(data: string | Buffer): boolean;
		// Same data argument and return value as parse() but emits errors and isFinal is true.
		end(data: string | Buffer): boolean;

		reset(): boolean;

		getCurrentLineNumber(): number;
		getCurrentColumnNumber(): number;
		getCurrentByteIndex(): number;
	}

	// export function createParser(cb: ???): Parser TODO
}   
