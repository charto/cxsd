// This file is part of fast-xml, copyright (c) 2015 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as expat from 'node-expat';
import {FetchOptions, Cache} from 'cget'

import * as types from './types'
import {Parser} from './Parser'
import {Namespace} from './Namespace'
import {Source} from './Source'
import {Scope} from './Scope'
import {QName} from './QName'

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

	startText(xsdElement: types.Base) {
		this.stateStatic.textHandlerList[this.stateStatic.textDepth++] = xsdElement;
	}
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
		addImport: (namespaceTarget: Namespace, urlRemote: string) => void;
		getLineNumber: () => number;
		textHandlerList: types.Base[];
		textDepth: number;
	};
}

/** Parser rule, defines a handler class, valid attributes and children
  * for an XSD tag. */

export class Rule {
	constructor(qName: QName, proto: types.BaseClass) {
		this.qName = qName;
		this.proto = proto;
	}

	qName: QName;
	proto: types.BaseClass;

	attributeList: string[] = [];
	followerTbl: {[id: string]: Rule} = {};
}
