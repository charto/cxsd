// This file is part of cxml, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {Namespace} from './Namespace';
import {Member} from './Member';
import * as exporter from './exporter';

function sanitizeName(name: string) {
	return(name.replace(/[^_0-9A-Za-z]/g, '').replace(/^[^A-Za-z]+/, ''));
}

export class Type {
	exportContentTS(namespace: Namespace, indent: string) {
		var output: string[] = [];

		if(this.literalType) {
			if(this.primitiveList && this.primitiveList.length > 0) {
				if(this.primitiveList.length > 1) {
					output.push('(' + this.primitiveList.join(' | ') + ')');
				} else output.push(this.primitiveList[0]);
			} else output.push(this.literalType);
		} else {
			var members = this.exportMembersTS(namespace, indent + '\t', '');

			output.push('{');
			if(members) {
				output.push('\n');
				output.push(members);
				output.push('\n' + indent);
			}
			output.push('}');
		}

		return(output.join(''));
	}

	/** Output a type definition. */

	exportTS(namespace: Namespace, indent: string, syntaxPrefix: string) {
		var output: string[] = [];
		var comment = this.comment;
		var parentDef = '';

		var name = sanitizeName(this.name);

		this.exported = true;

		if(comment) {
			output.push(exporter.TS.formatComment(indent, comment));
			output.push('\n');
		}

		var content = this.exportContentTS(namespace, indent);

		if(this.literalType) {
			output.push(indent + syntaxPrefix + 'type ' + name + ' = ' + content + ';');
		} else {
			if(this.parent) {
				if(this.parent.literalType) {
					// TODO: extend a literal type class.
				} else {
					parentDef = ' extends ' + this.parent.exportRefTS(namespace, indent + '\t', '_');
				}
			}
			output.push(indent + syntaxPrefix + 'interface _' + name + parentDef + ' ' + content + '\n');
			output.push(indent + syntaxPrefix + 'interface ' + name + ' extends _' + name + ' { new(): ' + name + '; }');
		}

		return(output.join(''));
	}

	/** Output all member elements and attributes of a type. */

	exportMembersTS(namespace: Namespace, indent: string, syntaxPrefix: string) {
		var output: string[] = [];
		var parentType = this.parent;

		for(var attribute of this.attributeList) {
			var outAttribute = attribute.exportTS(namespace, indent, '$' + syntaxPrefix, parentType, true);
			if(outAttribute) output.push(outAttribute);
		}

		for(var child of this.childList) {
			var outElement = child.exportTS(namespace, indent, syntaxPrefix, parentType, true);
			if(outElement) output.push(outElement);
		}

		return(output.join('\n'));
	}

	/** Output a reference to a type, for example the type of a member inside
	  * an interface declaration. */

	exportRefTS(outNamespace: Namespace, indent: string, prefix = '') {
		var output: string[] = [];

		if(this.name) {
			var namespace = this.namespace;
			var name = prefix + sanitizeName(this.name);

			if(!namespace || namespace == outNamespace) {
				output.push(name);
			} else {
				// Type from another, imported namespace.

				var short = outNamespace.getShortRef(namespace.id);

				if(short) {
					output.push(short + '.' + name);
				} else {
					console.error('MISSING IMPORT ' + namespace.name + ' for type ' + this.name);
					output.push('any');
				}
			}
		} else if(this.exported) {
			// TODO: Generate names for all circularly defined types so this never happens!
			output.push('any');
		} else if(this.parent) {
			// TODO: Generate names for all derived types so this never happens!
			output.push('any');
		} else {
			// Anonymous type defined only within this element.
			this.exported = true;

			output.push(this.exportContentTS(outNamespace, indent));
		}

		return(output.join(''));
	}

	buildMemberTbl() {
		var member: Member;

		var tbl = this.memberTbl;
		tbl = {};

		for(member of this.attributeList) tbl[member.name] = member;
		for(member of this.childList) tbl[member.name] = member;

		this.memberTbl = tbl;
	}

/*
	getMember(name: string) {
		var type: Type = this;
		var member: Member;

		do {
			if(type.memberTbl) member = type.memberTbl[name];
			type = type.parent;
		} while(!member && type);

		return(member);
	}
*/

	name: string;
	namespace: Namespace;

	/** JavaScript type name, if the XML type only contains single value
	  * that can be parsed into a JavaScript value. */
	literalType: string;
	/** List of allowed literal values, if such a restriction is defined. */
	primitiveList: string[];

	memberTbl: {[name: string]: Member};
	/** XML attributes in an element of this type. */
	attributeList: Member[];
	/** Allowed child elements for an element of this type. */
	childList: Member[];

	/** Parent type this is derived from. */
	parent: Type;

	comment: string;

	exported: boolean;
}
