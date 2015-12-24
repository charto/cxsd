// This file is part of fast-xml, copyright (c) 2015 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {Namespace} from './Namespace';
import {Scope, TypeMember} from './Scope';
import * as types from './types';

/** Export parsed schema to a TypeScript d.ts definition file. */

export class ExporterTS {
	formatComment(indent: string, comment: string) {
		var lineList = comment.split('\n');
		var lineCount = lineList.length;
		var blankCount = 0;
		var contentCount = 0;
		var output: string[] = [];
		var prefix = '/\**';

		for(var line of lineList) {
			// Remove leading whitespace.
			line = line.replace(/^\s+/, '');

			// Remove trailing whitespace.
			line = line.replace(/\s+$/, '');

			if(!line) ++blankCount;
			else {
				if(blankCount && contentCount) output.push(indent + prefix);

				output.push(indent + prefix + ' ' + line);
				prefix = '  *';

				++contentCount;
				blankCount = 0;
			}
		}

		if(output.length) output[output.length - 1] += ' *\/';

		return(output.join('\n'));
	}

	exportElement(indent: string, spec: TypeMember) {
		var element = spec.item as types.Element;
		var optional = (spec.min == 0 ? '?' : '');
		var multiple = (spec.max > 1 ? '[]' : '');

		console.log(indent + element.name + optional + ': ' + (element.getTypeName() || 'any') + multiple + ';');
	}

	exportType(indent: string, spec: TypeMember) {
		var scope = spec.item.getScope();
		var comment = scope.getComments();
		var elementTbl = scope.dumpElements();
		var parentDef = '';

		if(comment) console.log(this.formatComment(indent, comment));

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
