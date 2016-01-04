// This file is part of fast-xml, copyright (c) 2015 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {Cache} from 'cget'
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

	exportElement(indent: string, prefix: string, spec: TypeMember) {
		var output: string[] = [];
		var element = spec.item as types.Element;
		var scope = element.getScope();
		var comment = scope.getComments();

		if(comment) {
			output.push(this.formatComment(indent, comment));
			output.push('\n');
		}

		output.push(indent + prefix + element.name);
		if(spec.min == 0) output.push('?');
		output.push(': ');

		var typeDef = element.getTypeName();

		if(typeDef) output.push(typeDef);
		else {
			var type = element.getType();

			if(!type) output.push('any');
			else if(type.parent || type.exported) {
				// TODO: Generate names for all derived and circularly defined types so this never happens!
				output.push('any');
			} else {
				type.exported = true;
				var members = this.exportTypeMembers(indent + '\t', type.getScope());

				output.push('{');
				if(members) {
					output.push('\n');
					output.push(members);
					output.push('\n' + indent);
				}
				output.push('}');
			}
		}

		if(spec.max > 1) output.push('[]');
		output.push(';');

		return(output.join(''));
	}

	exportTypeMembers(indent: string, scope: Scope) {
		var elementTbl = scope.dumpElements();

		return(Object.keys(elementTbl).map((key: string) =>
			this.exportElement(indent, '', elementTbl[key])
		).join('\n'));
	}

	exportType(indent: string, prefix: string, spec: TypeMember) {
		var output: string[] = [];
		var type = spec.item as types.TypeBase;
		var scope = type.getScope();
		var comment = scope.getComments();
		var parentDef = '';

		type.exported = true;

		if(comment) {
			output.push(this.formatComment(indent, comment));
			output.push('\n');
		}

		var parent = type.parent;

		if(parent && parent instanceof types.Primitive) {
			output.push(indent + prefix + 'type ' + spec.item.name + ' = ' + parent.name + ';');
		} else {
			if(parent) parentDef = ' extends ' + parent.name;
			var members = this.exportTypeMembers(indent + '\t', scope);

			output.push(indent + prefix + 'interface ' + spec.item.name + parentDef + ' {');
			if(members) {
				output.push('\n');
				output.push(members);
				output.push('\n' + indent);
			}
			output.push('}');
		}

		return(output.join(''));
	}

	export(namespace: Namespace) {
		var output: string[] = [];
		var scope = namespace.getScope();

		var typeTbl = scope.dumpTypes();

		for(var key of Object.keys(typeTbl)) {
			output.push(this.exportType('', 'export ', typeTbl[key]));
		}

		var elementTbl = scope.dumpElements();

		for(var key of Object.keys(elementTbl)) {
			output.push(this.exportElement('', 'export var ', elementTbl[key]));
		}

		output.push('');

		return(ExporterTS.cache.store(namespace.name + '.d.ts', output.join('\n')));
	}

	private static cache = new Cache('cache/js', '_index.js');
}
