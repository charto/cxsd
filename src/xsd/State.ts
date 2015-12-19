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
	};
}

export class Rule {
	constructor(qName: QName, proto: any) {
		this.qName = qName;
		this.proto = proto;
	}

	qName: QName;
	proto: any;

	attributeList: string[] = [];
	followerTbl: {[id: string]: Rule} = {};
}
