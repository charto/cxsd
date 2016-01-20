// This file is part of cxml, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {Namespace} from './Namespace';
import {Type} from './Type';
import * as exporter from './exporter';

export class Member {
	constructor(name: string, min: number, max: number) {
		this.name = name;
		this.min = min;
		this.max = max;
	}

	/** Output an element, which can be an exported variable
	  * or a member of an interface. */

	exportTS(namespace: Namespace, indent: string, syntaxPrefix: string, parentType: Type, outputOptionalFlags: boolean) {
		var output: string[] = [];
		var comment = this.comment;

		if(comment) {
			output.push(exporter.TS.formatComment(indent, comment));
			output.push('\n');
		}

		// TODO: propagate max and sanitize names in a separate transform step.
		// Topologically sort dependencies to start processing from root types,
		// to avoid continuing search after one parent with a matching member is found.

		var max = this.max;

		// Ensure maximum allowed occurrence count is no less than in parent types,
		// because overriding a parent class member with a different type
		// (array vs non-array) doesn't compile.

		if(max < 2 && parentType) {
			var type = parentType;
			var member: Member;

			do {
				if(type.memberTbl) {
					member = type.memberTbl[this.name];
					if(member && member.max > max) {
						max = member.max;
						if(max > 1) break;
					}
				}
				type = type.parent;
			} while(type);
		}

		output.push(indent + syntaxPrefix + this.safeName);
		if(outputOptionalFlags && this.min == 0) output.push('?');
		output.push(': ');

		var outTypeList = this.typeList.map(
			(type: Type) => type.exportRefTS(namespace, indent)
		);

		if(outTypeList.length == 0) return('');

		var outTypes = outTypeList.sort().join(' | ');
		var suffix = '';

		if(max > 1) suffix = '[]';

		if(suffix && outTypeList.length > 1) outTypes = '(' + outTypes + ')';

		output.push(outTypes);
		output.push(suffix + ';');

		return(output.join(''));
	}

	name: string;
	namespace: Namespace;
	safeName: string;

	min: number;
	max: number;

	typeList: Type[];

	comment: string;
}
