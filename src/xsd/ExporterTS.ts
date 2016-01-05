// This file is part of fast-xml, copyright (c) 2015 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as path from 'path';
import * as Promise from 'bluebird';

import {Cache} from 'cget'
import {Namespace} from './Namespace';
import {Scope, TypeMember} from './Scope';
import * as types from './types';

/** Export parsed schema to a TypeScript d.ts definition file. */

export class ExporterTS {
	constructor(namespace: Namespace) {
		if(namespace.name) {
			this.namespace = namespace;
			this.cacheDir = path.dirname(
				ExporterTS.cache.getCachePathSync(namespace.name)
			);
		}
	}

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

	exportElement(indent: string, syntaxPrefix: string, spec: TypeMember) {
		var output: string[] = [];
		var element = spec.item as types.Element;
		var scope = element.getScope();
		var comment = scope.getComments();
		var short: string;

		if(comment) {
			output.push(this.formatComment(indent, comment));
			output.push('\n');
		}

		output.push(indent + syntaxPrefix + element.name);
		if(spec.min == 0) output.push('?');
		output.push(': ');

		var type = element.getType();

		if(!type) {
			// Unresolved type.
			output.push('any');
		} else if(type.qName) {
			var namespace = type.qName.namespace;
			if(namespace == this.namespace) {
				// Type from the current namespace.
				output.push(type.name);
			} else {
				// Type from another, imported namespace.
				if(this.shortNameTbl[namespace.id] && this.shortNameTbl[namespace.id].length) {
					short = this.shortNameTbl[namespace.id][0];
				} else {
					console.error('MISSING IMPORT ' + namespace.name + ' <- ' + namespace.url);
					short = 'ERROR';
				}
				output.push(short + '.' + type.name);
				this.namespaceUsedTbl[namespace.id] = namespace;
			}
		} else if(type.name) {
			// Primitive type.
			output.push(type.name);
		} else if(type.parent || type.exported) {
			// TODO: Generate names for all derived and circularly defined types so this never happens!
			output.push('any');
		} else {
			// Anonymous type defined only within this element.
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

	exportType(indent: string, syntaxPrefix: string, namespacePrefix: string, type: types.TypeBase) {
		var output: string[] = [];
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
			output.push(indent + syntaxPrefix + 'type ' + type.name + ' = ' + parent.name + ';');
		} else {
			if(parent) parentDef = ' extends ' + parent.name;
			var members = this.exportTypeMembers(indent + '\t', scope);

			output.push(indent + syntaxPrefix + 'interface ' + type.name + parentDef + ' {');
			if(members) {
				output.push('\n');
				output.push(members);
				output.push('\n' + indent);
			}
			output.push('}');
		}

		return(output.join(''));
	}

	export(): Promise<Namespace> {
		if(!this.namespace) return(null);

		var outName = this.namespace.name + '.d.ts';

		return(ExporterTS.cache.ifCached(outName).then((isCached: boolean) =>
			isCached ? this.namespace : this.forceExport(outName)
		));
	}

	forceExport(outName: string): Promise<Namespace> {
		var outSources: string[] = [];
		var outImports: string[] = [];
		var outTypes: string[] = [];
		var scope = this.namespace.getScope();

		var typeTbl = scope.dumpTypes();

		outSources.push('// Source files:');

		var sourceList = this.namespace.getSourceList();
		var namespaceRefTbl: {[name: string]: Namespace};

		for(var source of sourceList) {
			outSources.push('// ' + source.url);

			namespaceRefTbl = source.getNamespaceRefs();

			for(var name in namespaceRefTbl) {
				var id = namespaceRefTbl[name].id;

				if(!this.shortNameTbl[id]) this.shortNameTbl[id] = [];
				this.shortNameTbl[id].push(name);
			}
		}

		outSources.push('');

		for(var key of Object.keys(typeTbl)) {
			outTypes.push(this.exportType('', 'export ', '', typeTbl[key].item));
		}

		var elementTbl = scope.dumpElements();

		for(var key of Object.keys(elementTbl)) {
			outTypes.push(this.exportElement('', 'export var ', elementTbl[key]));
		}

		outTypes.push('');

		var importKeyList = Object.keys(this.namespaceUsedTbl);
		var importList: Namespace[] = [];

		if(importKeyList.length) {
			for(var key of importKeyList) {
				var namespace = this.namespaceUsedTbl[key];

				if(!this.shortNameTbl[key] || !this.shortNameTbl[key].length) continue;

				importList.push(namespace);
				outImports.push(
					'import * as ' +
					this.shortNameTbl[key][0] +
					' from ' +
					"'" + this.getPathTo(namespace) + "';"
				);
			}

			outImports.push('');
		}

		return(ExporterTS.cache.store(
			outName,
			[].concat(
				outImports,
				outSources,
				outTypes
			).join('\n')
		).then(() => Promise.map(
			importList,
			(namespace: Namespace) => new ExporterTS(namespace).export()
		).then(() => namespace)))
	}

	getPathTo(namespace: Namespace) {
		return(path.relative(
			this.cacheDir,
			ExporterTS.cache.getCachePathSync(namespace.name)
		));
	}

	private static cache = new Cache('cache/js', '_index.js');

	private namespace: Namespace;

	private cacheDir: string;

	private shortNameTbl: {[namespaceId: number]: string[]} = {};
	private namespaceUsedTbl: {[namespaceId: number]: Namespace} = {};
}
