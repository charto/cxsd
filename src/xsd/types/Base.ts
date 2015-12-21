// This file is part of fast-xml, copyright (c) 2015 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {State, Rule} from '../State';
import {Namespace} from '../Namespace';
import {Scope} from '../Scope';
import {QName} from '../QName';

/** Common base for all schema tags */

export interface BaseClass {
	new(...args: any[]): Base;
	mayContain(): BaseClass[];

	namespace: Namespace;
	name: string;
	rule: Rule;
}

export class Base {
	static mayContain = () => ([] as BaseClass[]);
	constructor(state: State) {
		if(!state) return;

		this.scope = state.getScope();
		this.lineNumber = state.stateStatic.getLineNumber();
	}

	init(state: State) {}
	resolve(state: State) {}

	define(state: State, type: string, min = 1, max = 1, scope?: Scope) {
		if(this.name) (scope || this.scope).addToParent(new QName(this.name, state.source), type, this, min, max);
	}

	scope: Scope;
	lineNumber: number;
	name: string;

	static namespace: Namespace = Namespace.register('http://www.w3.org/2001/XMLSchema', 'http://www.w3.org/2009/XMLSchema/XMLSchema.xsd', 'xsd');
	static name: string;
	static rule: Rule;
}
