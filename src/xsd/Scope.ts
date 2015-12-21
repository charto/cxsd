// This file is part of fast-xml, copyright (c) 2015 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as types from './types';
import {Namespace} from './Namespace'
import {QName} from './QName'
import {Element} from './types/Element';
import {TypeBase} from './types/ComplexType';

export interface TypeMember {
	min: number;
	max: number;
	item: any;
}

export class Scope {
	constructor(parent: Scope, namespace?: Namespace) {
		if(!namespace && parent) namespace = parent.namespace;

		this.parent = parent;
		this.namespace = namespace;
	}

	addString(name: string, type: string, target: any, min: number, max: number) {
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

	lookup(name: QName, type: string): any {
		var scope: Scope = this;

		if(name.namespace && name.namespace != this.namespace) {
			scope = name.namespace.getScope();
		}

		while(scope) {
			if(scope.visible[type]) {
				var result = scope.visible[type][name.nameFull];

				if(result) return(result);
			}

			scope = scope.parent;
		}

		return(null);
	}

	// Types

	setType(type: types.TypeBase) {
		// TODO: set to some invalid value if called more than once.
		if(!this.type) this.type = type;
	}

	getType() { return(this.type); }

	dumpTypes() {
		return((this.expose['type'] || {}) as {[name: string]: TypeMember});
	}

	dumpElements() {
		return((this.expose['element'] || {}) as {[name: string]: TypeMember});
	}

	private parent: Scope;
	private namespace: Namespace;

	private visible = {} as {
		[type: string]: {[name: string]: any}
	};

	private expose = {} as {
		[type: string]: {[name: string]: TypeMember}
	};

	private type: types.TypeBase;
}
