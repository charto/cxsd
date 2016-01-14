// This file is part of fast-xml, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {Type} from './Type';
import {ExporterTS} from '../xsd/ExporterTS';

export class Member {
	constructor(name: string, min: number, max: number) {
		this.name = name;
		this.min = min;
		this.max = max;
	}

	/** Output an element, which can be an exported variable
	  * or a member of an interface. */

	exportTS(indent: string, syntaxPrefix: string, outputOptionalFlags: boolean, exporter: ExporterTS) {
		var output: string[] = [];
		var comment = this.comment;

		if(comment) {
			output.push(exporter.formatComment(indent, comment));
			output.push('\n');
		}

		output.push(indent + syntaxPrefix + this.name);
		if(outputOptionalFlags && this.min == 0) output.push('?');
		output.push(': ');

		var outTypeList = this.typeList.map(
			(type: Type) => type.exportRefTS(indent, exporter)
		);

		if(outTypeList.length == 0) return('');

		var outTypes = outTypeList.sort().join(' | ');
		var suffix = '';

		if(this.max > 1) suffix = '[]';

		if(suffix && outTypeList.length > 1) outTypes = '(' + outTypes + ')';

		output.push(outTypes);
		output.push(suffix + ';');

		return(output.join(''));
	}

	name: string;

	min: number;
	max: number;

	typeList: Type[];

	comment: string;
}
