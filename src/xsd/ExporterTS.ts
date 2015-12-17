// This file is part of fast-xml, copyright (c) 2015 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {Namespace} from './Namespace';
import {Scope} from './Scope';

export class ExporterTS {
	export(namespace: Namespace) {
		var scope = namespace.getScope();

		console.log('declare module "' + namespace.name + '" {');

		var typeTbl = scope.dumpTypes();

		for(var key of Object.keys(typeTbl)) {
			var type = typeTbl[key];
			console.log('\tinterface ' + type.name + ' {');
//console.log((type as any).scope.data);
			console.log('\t}');
		}

		var elementTbl = scope.dumpElements();

		for(var key of Object.keys(elementTbl)) {
			var element = elementTbl[key];
			console.log('\tvar ' + element.name + ': ' + element.type);
		}

		console.log('}');
	}
}
