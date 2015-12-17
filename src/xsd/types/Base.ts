// This file is part of fast-xml, copyright (c) 2015 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {State, Rule} from '../../XsdState';
import {Scope} from '../Scope'
import {QName} from '../QName'

/** Common base for all schema tags */

export interface BaseClass {
	new(...args: any[]): Base;
	mayContain(): BaseClass[];

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
	finish(state: State) {}

	bind(state: State, type: string, scope?: Scope) {
		if(this.name) (scope || this.scope).addToParent(new QName(this.name, state.source), type, this);
	}

	scope: Scope;
	lineNumber: number;
	name: string;

	static name: string;
	static rule: Rule;
}
