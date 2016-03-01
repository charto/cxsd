// This file is part of cxsd, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {Cache} from 'cget'
import {Exporter} from './Exporter';
import {Namespace} from '../Namespace';
import {Member} from '../Member';
import {MemberRef} from '../MemberRef';
import {Type} from '../Type';

var docName = 'document';
var baseName = 'BaseType';

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
			// Remove leading and trailing whitespace.
			line = line.trim();

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

	writeParents(parentDef: string, mixinList: Type[]) {
		var parentList: string[] = [];

		if(parentDef) parentList.push(parentDef);

		for(var type of mixinList || []) {
			parentList.push(this.writeTypeRef(type, '_'));
		}

		if(!parentList.length) parentList.push(baseName);

		return(' extends ' + parentList.join(', '));
	}

	writeTypeList(ref: MemberRef) {
		var typeList = ref.member.typeList;

		if(ref.max > 1 && ref.member.proxy) typeList = [ref.member.proxy];

		var outTypeList = typeList.map(
			(type: Type) => {
				if(type.isPlainPrimitive && (!type.literalList || !type.literalList.length)) {
					return(type.primitiveType.name);
				} else return(this.writeTypeRef(type, ''));
			}
		);

		if(outTypeList.length == 0) return(null);

		var outTypes = outTypeList.sort().join(' | ');

		if(ref.max > 1) {
			if(outTypeList.length > 1) return('(' + outTypes + ')[]');
			else return(outTypes + '[]');
		} else return(outTypes);
	}

	writeMember(ref: MemberRef, isGlobal: boolean) {
		var output: string[] = [];
		var member = ref.member;
		var comment = member.comment;
		var indent = '\t';

		if((ref as any).isHidden) return('');
		if(isGlobal && member.isAbstract) return('');
		if(member.name == '*') return('');

		if(comment) {
			output.push(TS.formatComment(indent, comment));
			output.push('\n');
		}

		output.push(indent + ref.safeName);
		if(ref.min == 0) output.push('?');
		output.push(': ');

		var outTypes = this.writeTypeList(ref);
		if(!outTypes) return('');

		output.push(outTypes);
		output.push(';');

		return(output.join(''));
	}

	writeTypeContent(type: Type) {
		var output: string[] = [];

		if(type.isPlainPrimitive) {
			var literalList = type.literalList;

			if(literalList && literalList.length > 0) {
				if(literalList.length > 1) {
					output.push('(' + literalList.join(' | ') + ')');
				} else output.push(literalList[0]);
			} else output.push(type.primitiveType.name);
		} else if(type.isList) {
			output.push(this.writeTypeList(type.childList[0]));
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

	writeType(type: Type) {
		var namespace = this.namespace;
		var output: string[] = [];
		var comment = type.comment;
		var parentDef: string;
		var exportPrefix = type.isExported ? 'export ' : '';

		var name = type.safeName;

		if(comment) {
			output.push(TS.formatComment('', comment));
			output.push('\n');
		}

		var content = this.writeTypeContent(type);

		if(namespace.isPrimitiveSpace) {
			output.push(exportPrefix + 'interface _' + name + this.writeParents(null, type.mixinList) + ' { ' + 'content' + ': ' + type.primitiveType.name + '; }' + '\n');
		} else if(type.isList) {
			output.push(exportPrefix + 'type ' + name + ' = ' + content + ';' + '\n');
		} else if(type.isPlainPrimitive) {
			parentDef = this.writeTypeRef(type.parent, '_');

			output.push(exportPrefix + 'type ' + name + ' = ' + content + ';' + '\n');
			if(type.literalList && type.literalList.length) {
				output.push('interface _' + name + this.writeParents(parentDef, type.mixinList) + ' { ' + 'content' + ': ' + name + '; }' + '\n');
			} else {
				// NOTE: Substitution groups are ignored here!
				output.push('type _' + name + ' = ' + parentDef + ';' + '\n');
			}
		} else {
			if(type.parent) parentDef = this.writeTypeRef(type.parent, '_');

			output.push('interface _' + name + this.writeParents(parentDef, type.mixinList) + ' ' + content + '\n');
			output.push(exportPrefix + 'interface ' + name + ' extends _' + name + ' { constructor: { new(): ' + name + ' }; }' + '\n');
			if(type.isExported) output.push(exportPrefix + 'var ' + name + ': { new(): ' + name + ' };' + '\n');
		}

		return(output.join(''));
	}

	writeSubstitutions(type: Type, refList: MemberRef[], output: string[]) {
		for(var ref of refList) {
			var proxy = ref.member.proxy;

			if(!ref.member.isAbstract) output.push(this.writeMember(ref, false));

			if(proxy && proxy != type) this.writeSubstitutions(proxy, proxy.childList, output);
		}

		for(var mixin of type.mixinList) {
			if(mixin != type) this.writeSubstitutions(mixin, mixin.childList, output);
		}
	}

	writeAugmentations(output: string[]) {
		var namespace = this.namespace;

		for(var namespaceId of Object.keys(namespace.augmentTbl)) {
			var augmentTbl = namespace.augmentTbl[namespaceId];
			var typeIdList = Object.keys(augmentTbl);
			var type = augmentTbl[typeIdList[0]].type;
			var other = type.namespace;

			output.push('declare module ' + "'" + this.getPathTo(other.name) + "'" + ' {');

			for(var typeId of typeIdList) {
				type = augmentTbl[typeId].type;

				output.push('export interface _' + type.safeName + ' {');

				for(var ref of augmentTbl[typeId].refList) {
					ref.safeName = ref.member.safeName;
				}

				this.writeSubstitutions(type, augmentTbl[typeId].refList, output);

				output.push('}');
			}

			output.push('}');
		}
	}

	writeContents(): string {
		var output = this.writeHeader();
		var doc = this.doc;
		var namespace = this.namespace;
		var prefix: string;

		output.push('');
		output = output.concat(this.exportSourceList(namespace.sourceList));

		output.push('');
		this.writeAugmentations(output);

		output.push('interface ' + baseName + ' {');
		output.push('\t_exists: boolean;');
		output.push('\t_namespace: string;');
		output.push('}');

		for(var type of namespace.typeList.slice(0).sort((a: Type, b: Type) => a.safeName.localeCompare(b.safeName))) {
			if(!type) continue;

			output.push(this.writeType(type));
		}

		output.push('export interface ' + docName + ' extends ' + baseName + ' {');

		for(var child of doc.childList) {
			var outElement = this.writeMember(child, true);
			if(outElement) {
				output.push(outElement);
			}
		}

		output.push('}');
		output.push('export var ' + docName + ': ' + docName + ';\n');

		return(output.join('\n'));
	}

	getOutName(name: string) {
		return(name + '.d.ts');
	}

	construct = TS;
}
