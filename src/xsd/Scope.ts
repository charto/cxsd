// This file is part of cxsd, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as types from './types';
import {Namespace} from './Namespace'
import {QName} from './QName'

export interface TypeMember {
	min: number;
	max: number;
	item: any;
}

/** Scope handles looking up references by type and name, and binding member
  * types and elements to types or namespaces. */

export class Scope {
	constructor(parent: Scope, namespace?: Namespace) {
		if(!namespace && parent) namespace = parent.namespace;

		this.parent = parent;
		this.namespace = namespace;
	}

	private addString(name: string, type: string, target: any, min: number, max: number) {
		var visibleTbl = this.visible[type];

		if(!visibleTbl) {
			visibleTbl = {} as {[name: string]: any};
			this.visible[type] = visibleTbl;
		}

		visibleTbl[name] = target;

		var exposeTbl = this.expose[type];

		if(!exposeTbl) {
			exposeTbl = {} as {[name: string]: TypeMember};
			this.expose[type] = exposeTbl;
		}

		if(exposeTbl[name]) {
			// For sequences, sum occurrence counts among matching element types.

			min += exposeTbl[name].min;
			max += exposeTbl[name].max;
		}

		exposeTbl[name] = {
			min: min,
			max: max,
			item: target
		};
	}

	add(name: QName, type: string, target: any, min: number, max: number) {
		this.addString(name.nameFull, type, target, min, max);
	}

	addToParent(name: QName, type: string, target: any, min: number, max: number) {
		this.parent.add(name, type, target, min, max);
	}

	addAllToParent(type: string, min = 1, max = 1, target?: Scope) {
		// Check if there's anything to add.
		if(!this.visible[type]) return;
		if(!target) target = this;
		target = target.parent;

		var exposeTbl = this.expose[type];

		for(var name of Object.keys(exposeTbl)) {
			var spec = exposeTbl[name];
			// TODO: If target is a choice, it must take the overall min and max.
			target.addString(name, type, spec.item, spec.min * min, spec.max * max);
		}
	}

	addComments(commentList: string[]) {
		this.commentList = (this.commentList || []).concat(commentList);
	}

	addCommentsToGrandParent(commentList: string[]) {
		this.parent.parent.addComments(commentList);
	}

	getComments() {
		if(!this.commentList) return(null);

		// Convert line breaks.
		return(this.commentList.join('').replace(/\r\n?|\n/g, '\n'));
	}

	lookup(name: QName, type: string): any {
		var scope: Scope = this;
		var nameFull = name.nameFull;
		var nameWild = '*:' + name.name;

		if(name.namespace && name.namespace != this.namespace) {
			scope = name.namespace.getScope();
		}

		var iter = 100;

		while(scope && --iter) {
			if(scope.visible[type]) {
				var result = scope.visible[type][nameFull] || scope.visible[type][nameWild];

				if(result) return(result);
			}

			scope = scope.parent;
		}

console.log('Missing ' + type + ': ' + name.name);

		return(null);
	}

	// Types

	setType(type: types.TypeBase) {
		// TODO: set to some invalid value if called more than once.
		if(!this.type && this.namespace.getScope() != this) this.type = type;
	}

	setParentType(type: types.TypeBase) {
		this.parent.setType(type);
	}

	getParentType(namespace: Namespace): types.TypeBase {
		for(var parent = this.parent; parent && parent.namespace == namespace; parent = parent.parent) {
			if(parent.type) return(parent.type);
		}

		return(null);
	}

	getType(): types.TypeBase { return(this.type); }

	dumpTypes() {
		return((this.expose['type'] || {}) as {[name: string]: TypeMember});
	}

	dumpElements() {
		return((this.expose['element'] || {}) as {[name: string]: TypeMember});
	}

	dumpAttributes() {
		return((this.expose['attribute'] || {}) as {[name: string]: TypeMember});
	}

	hasAttributes() {
		var tbl = this.expose['attribute'];

		for(var key in tbl) if(tbl.hasOwnProperty(key)) return(true);

		return(false);
	}

	private parent: Scope;
	namespace: Namespace;

	private visible = {} as {
		[type: string]: {[name: string]: any}
	};

	private expose = {} as {
		[type: string]: {[name: string]: TypeMember}
	};

	private type: types.TypeBase;

	private commentList: string[];

	private static primitiveScope: Scope;
}
