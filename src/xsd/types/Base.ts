// This file is part of cxml, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {State, Rule} from '../State';
import {Namespace} from '../Namespace';
import {Scope} from '../Scope';
import {QName} from '../QName';

/** Common constructor type for schema tag handler classes. */

export interface BaseClass {
	new(state?: State): Base;

	/** Returns other classes allowed as children. */
	mayContain(): BaseClass[];

	getNamespace(): Namespace;

	name: string;
	rule: Rule;
}

/** Common handler base class for all schema tags. */

export class Base {
	/** Returns other classes allowed as children. */
	static mayContain = () => ([] as BaseClass[]);

	constructor(state?: State) {
		if(!state) return;

		this.scope = state.getScope();
		this.lineNumber = state.stateStatic.getLineNumber();
		this.bytePos = state.stateStatic.getBytePos();
	}

	/** Hook, runs after opening tag. */
	init(state: State) {}

	/** Hook, runs for text content. */
	addText(state: State, text: string) {}

	/** Hook, runs after closing tag. */
	loaded(state: State) {}

	/** Hook, runs after all dependencies have been loaded. */
	resolve(state: State) {}

	/** Add this named tag to scope, listed under given type.
	  * Optionally set number of allowed occurrences, for optional elements, sequences etc.
		* @return fully qualified name. */
	define(state: State, type: string, min = 1, max = 1, scope?: Scope) {
		if(!this.name) return(null);

		var qName = new QName(this.name, state.source);

		(scope || this.scope).addToParent(qName, type, this, min, max);

		return(qName);
	}

	getScope() { return(this.scope); }

	static getNamespace() {
		if(!Base.namespace) {
			Base.namespace = Namespace.register(
				'http://www.w3.org/2001/XMLSchema',
				'http://www.w3.org/2009/XMLSchema/XMLSchema.xsd',
				'xsd'
			);
		}
		return(Base.namespace);
	}

	protected scope: Scope;
	lineNumber: number;
	bytePos: number;
	name: string;

	private static namespace: Namespace;
	static name: string;
	static rule: Rule;
}
