// This file is part of cxsd, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as types from './types';

import {Rule} from './Rule';
import {Context} from './Context';
import {Namespace} from './Namespace';
import {Source} from './Source';
import {Scope} from './Scope';
import {QName} from './QName';

/** Parser state, passed around between functions. */

export class State {
	constructor(parent: State, rule: Rule, source?: Source) {
		if(parent) {
			this.stateStatic = parent.stateStatic;
			this.parent = parent;
			this.source = parent.source;
			this.scope = new Scope(parent.scope);
		} else {
			this.source = source;
			this.scope = new Scope(null);
		}

		this.rule = rule;
	}

	getScope() { return(this.scope); }
	setScope(scope: Scope) { this.scope = scope; }

	/** Begin capturing text content between tags, sent to the handler of the innermost tag. */
	startText(xsdElement: types.Base) {
		this.stateStatic.textHandlerList[this.stateStatic.textDepth++] = xsdElement;
	}

	/** Finish capturing text content. */
	endText() { --this.stateStatic.textDepth; }

	parent: State;
	rule: Rule;
	source: Source;
	private scope: Scope;

	attributeTbl: {[name: string]: string};
	xsdElement: types.Base;
	depth: number;
	index: number;

	stateStatic: {
		context: Context;
		addImport: (namespaceTarget: Namespace, urlRemote: string) => void;
		getLineNumber: () => number;
		getBytePos: () => number;
		textHandlerList: types.Base[];
		textDepth: number;
	};
}
