// This file is part of cxsd, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {Cache} from 'cget'
import {Exporter} from './Exporter';
import {Namespace, TypeState} from '../Namespace';
import {Member} from '../Member';
import {Type} from '../Type';

/** Export parsed schema to a TypeScript d.ts definition file. */

export class TS extends Exporter {

	/** Format an XSD annotation as JSDoc. */

	static formatComment(indent: string, comment: string) {
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

	writeImport(shortName: string, relativePath: string, absolutePath: string) {
		return(
			'import * as ' +
			shortName +
			' from ' +
			"'" + relativePath + "'" +
			';'
		);
	}

	/** Output list of original schema file locations. */

	exportSourceList(sourceList: string[]) {
		var output: string[] = [];

		output.push('// Source files:');

		for(var urlRemote of sourceList) {
			output.push('// ' + urlRemote);
		}

		output.push('');
		return(output);
	}

	writeTypeRef(type: Type, namePrefix: string) {
		var output: string[] = [];

		var namespace = type.namespace;
		var name = namePrefix + type.safeName;

		if(!namespace || namespace == this.namespace) {
			output.push(name);
		} else {
			// Type from another, imported namespace.

			var short = this.namespace.getShortRef(namespace.id);

			if(short) {
				output.push(short + '.' + name);
			} else {
				console.error('MISSING IMPORT ' + namespace.name + ' for type ' + type.name);
				output.push('any');
			}
		}

		return(output.join(''));
	}

	writeMember(member: Member, isExported: boolean) {
		var output: string[] = [];
		var comment = member.comment;
		var indent = isExported ? '' : '\t';
		var exportPrefix = isExported ? 'export var ' : '';

		if(comment) {
			output.push(TS.formatComment(indent, comment));
			output.push('\n');
		}

		output.push(indent + exportPrefix + member.safeName);
		if(!isExported && member.min == 0) output.push('?');
		output.push(': ');

		var outTypeList = member.typeList.map(
			(type: Type) => {
				if(type.literalType && (!type.primitiveList || !type.primitiveList.length)) {
					return(type.literalType.name);
				} else return(this.writeTypeRef(type, ''));
			}
		);

		if(outTypeList.length == 0) return('');

		var outTypes = outTypeList.sort().join(' | ');
		var suffix = '';

		if(member.max > 1) suffix = '[]';

		if(suffix && outTypeList.length > 1) outTypes = '(' + outTypes + ')';

		output.push(outTypes);
		output.push(suffix + ';');

		return(output.join(''));
	}

	writeTypeContent(type: Type) {
		var output: string[] = [];

		if(type.literalType) {
			var primitiveList = type.primitiveList;

			if(primitiveList && primitiveList.length > 0) {
				if(primitiveList.length > 1) {
					output.push('(' + primitiveList.join(' | ') + ')');
				} else output.push(primitiveList[0]);
			} else output.push(type.literalType.name);
		} else {
			var outMemberList: string[] = [];

			var output: string[] = [];
			var parentType = type.parent;

			for(var attribute of type.attributeList) {
				var outAttribute = this.writeMember(attribute, false);
				if(outAttribute) outMemberList.push(outAttribute);
			}

			for(var child of type.childList) {
				var outChild = this.writeMember(child, false);
				if(outChild) outMemberList.push(outChild);
			}

			output.push('{');

			if(outMemberList.length) {
				output.push('\n');
				output.push(outMemberList.join('\n'));
				output.push('\n');
			}

			output.push('}');
		}

		return(output.join(''));
	}

	writeType(type: Type, visible: boolean) {
		var namespace = this.namespace;
		var output: string[] = [];
		var comment = type.comment;
		var parentDef = '';
		var exportPrefix = visible ? 'export ' : '';

		var name = type.safeName;

		if(comment) {
			output.push(TS.formatComment('', comment));
			output.push('\n');
		}

		var content = this.writeTypeContent(type);

		if(namespace.isPrimitiveSpace) {
			output.push(exportPrefix + 'interface _' + name + ' { ' + 'content' + ': ' + type.literalType.name + '; }' + '\n');
		} else if(type.literalType) {
			parentDef = this.writeTypeRef(type.parent, '_');

			output.push(exportPrefix + 'type ' + name + ' = ' + content + ';' + '\n');
			if(type.primitiveList && type.primitiveList.length) {
				output.push('interface _' + name + ' extends ' + parentDef + ' { ' + 'content' + ': ' + name + '; }' + '\n');
			} else {
				output.push('type _' + name + ' = ' + parentDef + ';' + '\n');
			}
		} else {
			if(type.parent) {
				parentDef = ' extends ' + this.writeTypeRef(type.parent, '_');
			}
			output.push('interface _' + name + parentDef + ' ' + content + '\n');
			//output.push(exportPrefix + 'interface ' + name + ' extends _' + name + ' { new(): ' + name + '; }' + '\n');
			output.push(exportPrefix + 'interface ' + name + ' extends _' + name + ' { constructor: { new(): ' + name + ' }; }' + '\n');
			if(visible) output.push(exportPrefix + 'var ' + name + ': { new(): ' + name + ' };' + '\n');
		}

		return(output.join(''));
	}

	writeContents(): string {
		var output = this.writeHeader();
		var doc = this.doc;
		var namespace = this.namespace;
		var prefix: string;
		var exportCount = 0;

		output.push('');
		output = output.concat(this.exportSourceList(namespace.sourceList));

		for(var type of namespace.typeList.slice(0).sort((a: Type, b: Type) => a.safeName.localeCompare(b.safeName))) {
			if(!type) continue;

			var isExported = (namespace.typeStateList[type.surrogateKey] == TypeState.exported);

			output.push(this.writeType(type, isExported));
			if(isExported) ++exportCount;
		}

		for(var child of doc.childList) {
			var outElement = this.writeMember(child, true);
			if(outElement) {
				output.push(outElement);
				++exportCount;
			}
		}

		if(!exportCount) output.push('export {};');

		output.push('');

		return(output.join('\n'));
	}

	getCache() {
		return(TS.cache);
	}

	getOutName(name: string) {
		return(name + '.d.ts');
	}

	construct = TS;

	/** Cache where all output is written. */
	private static cache = new Cache('cache/js', '_index.js');
}
