// This file is part of fast-xml, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {State} from './State';
import {QName} from './QName';

import {Base, BaseClass, Annotation, Documentation} from './types/Base';
export {Base, BaseClass, Annotation, Documentation};
export {Schema, Root} from './types/Schema';
export {MemberBase} from './types/MemberBase';
export {Element} from './types/Element';
export {Group, Sequence, Choice, All} from './types/Group';
export {Attribute, AnyAttribute, AttributeGroup} from './types/Attribute';
export {TypeBase, Primitive} from './types/Primitive';
export {SimpleType, ComplexType, SimpleContent, ComplexContent} from './types/ComplexType';
export {Extension, Restriction} from './types/Extension';
export {Import, Include} from './types/Import';

export class MissingReferenceError extends Error {
	constructor(tag: Base, state: State, type: string, ref: QName) {
		this.name = 'MissingReferenceError';
		this.message = 'Missing ' + type + ': ' + ref.format() + ' on line ' + tag.lineNumber + ' of ' + state.source.url;

		super(this.message);
	}
}
