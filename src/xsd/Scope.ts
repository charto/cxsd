// This file is part of fast-xml, copyright (c) 2015 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as types from '../XsdTypes';
import {Namespace} from './Namespace'
import {QName} from './QName'

export class Scope {
	constructor(parent: Scope, namespace?: Namespace) {
		if(!namespace && parent) namespace = parent.namespace;

		this.parent = parent;
		this.namespace = namespace;
	}

	addString(name: string, type: string, target: any) {
		var tbl = this.data[type];

		if(!tbl) {
			tbl = {} as {[name: string]: any};
			this.data[type] = tbl;
		}

		tbl[name] = target;
	}

	add(name: QName, type: string, target: any) {
		this.addString(name.nameFull, type, target);
	}

	addToParent(name: QName, type: string, target: any) {
		this.parent.add(name, type, target);
	}

	addAllToParent(type: string, target?: Scope) {
		if(!this.data[type]) return;
		if(!target) target = this;
		target = target.parent;

		for(var name of Object.keys(this.data[type])) {
			target.addString(name, type, this.data[type][name]);
		}
	}

	lookup(name: QName, type: string): any {
		var scope: Scope = this;

		if(name.namespace && name.namespace != this.namespace) {
			scope = name.namespace.getScope();
		}

		while(scope) {
			if(scope.data[type]) {
				var result = scope.data[type][name.nameFull];

				if(result) return(result);
			}

			scope = scope.parent;
		}

		return(null);
	}

	// Types

	setType(type: types.XsdTypeBase) {
		// TODO: set to some invalid value if called more than once.
		if(!this.type) this.type = type;
	}

	getType() { return(this.type); }

	private parent: Scope;
	private namespace: Namespace;

	private data = {} as {
		[type: string]: {[name: string]: any}
	};

	private type: types.XsdTypeBase;
}
