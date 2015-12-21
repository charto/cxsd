// This file is part of fast-xml, copyright (c) 2015 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {Namespace} from './Namespace';
import {Scope, TypeMember} from './Scope';
import * as types from './types';

export class ExporterTS {
	exportElement(indent: string, spec: TypeMember) {
		var element = spec.item as types.Element;
		console.log(indent + element.name + ': ' + (element.getTypeName() || 'any') + ';');
	}

	exportType(indent: string, spec: TypeMember) {
		var elementTbl = spec.item.getScope().dumpElements();
		var parentDef = '';

		var parent = (spec.item as types.TypeBase).parent;

		if(parent) parentDef = ' extends ' + parent.name;

		console.log(indent + 'interface ' + spec.item.name + parentDef + ' {');

		for(var key of Object.keys(elementTbl)) {
			this.exportElement(indent + '\t', elementTbl[key]);
		}

		console.log(indent + '}');
	}

	export(namespace: Namespace) {
		var scope = namespace.getScope();

		console.log('declare module "' + namespace.name + '" {');

		var typeTbl = scope.dumpTypes();

		for(var key of Object.keys(typeTbl)) {
			this.exportType('\t', typeTbl[key]);
		}

		var elementTbl = scope.dumpElements();

		for(var key of Object.keys(elementTbl)) {
			this.exportElement('\tvar ', elementTbl[key]);
		}

		console.log('}');
	}
}
