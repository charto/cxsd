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
	getNamespace(): Namespace;

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

	/** Hook running after opening tag. */
	init(state: State) {}

	/** Hook running for text content. */
	addText(state: State, text: string) {}

	/** Hook running after closing tag. */
	loaded(state: State) {}

	/** Hook running after all dependencies have been loaded. */
	resolve(state: State) {}

	define(state: State, type: string, min = 1, max = 1, scope?: Scope) {
		if(this.name) (scope || this.scope).addToParent(new QName(this.name, state.source), type, this, min, max);
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
	name: string;

	private static namespace: Namespace;
	static name: string;
	static rule: Rule;
}

/** <xsd:annotation> */

export class Annotation extends Base {
	static mayContain: () => BaseClass[] = () => [
		Documentation
	];
}

/** <xsd:documentation> */

export class Documentation extends Base {
	init(state: State) {
		state.startText(this);
	}

	addText(state: State, text: string) {
		this.commentList.push(text);
	}

	loaded(state: State) {
		state.endText();
	}

	resolve(state: State) {
		this.scope.addCommentsToGrandParent(this.commentList);
	}

	commentList: string[] = [];
}
