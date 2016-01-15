// This file is part of fast-xml, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {Namespace} from './Namespace';
import {Member} from './Member';
import {ExporterTS} from './ExporterTS';

export class Type {
	exportContentTS(namespace: Namespace, indent: string) {
		var output: string[] = [];

		if(this.primitiveList && this.primitiveList.length) {
			if(this.primitiveList.length > 1) {
				output.push('(' + this.primitiveList.join(' | ') + ')');
			} else output.push(this.primitiveList[0]);
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

		this.exported = true;

		if(comment) {
			output.push(ExporterTS.formatComment(indent, comment));
			output.push('\n');
		}

		var content = this.exportContentTS(namespace, indent);

		if(this.primitiveList && this.primitiveList.length) {
			output.push(indent + syntaxPrefix + 'type ' + this.name + ' = ' + content + ';');
		} else {
			if(this.parent) parentDef = ' extends ' + this.parent.exportRefTS(namespace, indent + '\t');
			output.push(indent + syntaxPrefix + 'interface ' + this.name + parentDef + ' ' + content);
		}

		return(output.join(''));
	}

	/** Output all member elements and attributes of a type. */

	exportMembersTS(namespace: Namespace, indent: string, syntaxPrefix: string) {
		var output: string[] = [];

		for(var attribute of this.attributeList) {
			var outAttribute = attribute.exportTS(namespace, indent, syntaxPrefix, true);
			if(outAttribute) output.push(outAttribute);
		}

		for(var child of this.childList) {
			var outElement = child.exportTS(namespace, indent, syntaxPrefix, true);
			if(outElement) output.push(outElement);
		}

		return(output.join('\n'));
	}

	/** Output a reference to a type, for example the type of a member inside
	  * an interface declaration. */

	exportRefTS(outNamespace: Namespace, indent: string) {
		var output: string[] = [];

		if(this.name) {
			var namespace = this.namespace;

			if(!namespace || namespace == outNamespace) {
				output.push(this.name);
			} else {
				// Type from another, imported namespace.

				var short = outNamespace.getShortRef(namespace.id);

				if(!short) {
					console.error('MISSING IMPORT ' + namespace.name);
					short = 'ERROR';
				}

				output.push(short + '.' + this.name);
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

	name: string;
	namespace: Namespace;

//	aliasable: boolean;	// Type can be represented as a type alias in TypeScript if attributeList and childList are empty, and it has no name.
	primitiveList: string[];

	attributeList: Member[];
	childList: Member[];

	parent: Type;

	comment: string;

	exported: boolean;
}
