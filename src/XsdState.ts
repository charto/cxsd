// This file is part of fast-xml, copyright (c) 2015 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as types from './XsdTypes'
import {FetchOptions, Cache} from 'cget'
import {XsdParser} from './XsdParser'
import {Namespace} from './xsd/Namespace'
import {Source} from './xsd/Source'
import {Scope} from './xsd/Scope'
import {QName} from './xsd/QName'

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

	parent: State;
	rule: Rule;
	source: Source;
	private scope: Scope;

	attributeTbl: {[name: string]: string};
	xsdElement: types.XsdBase;
	depth: number;
	index: number;

	stateStatic: {
		root: types.XsdSchema;

		addImport: (namespaceTarget: Namespace, urlRemote: string) => void;

		options: FetchOptions;
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
