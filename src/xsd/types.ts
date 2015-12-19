// This file is part of fast-xml, copyright (c) 2015 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {State, Rule} from '../XsdState';
import {XsdParser} from '../XsdParser';
import {Namespace} from './Namespace';
import {Source} from './Source';
import {Scope} from './Scope';
import {QName} from './QName';

import {Base, BaseClass} from './types/Base';
export {Base, BaseClass};
import {Schema, Root} from './types/Schema';
export {Schema, Root};
import {Element, ElementBase} from './types/Element';
export {Element, ElementBase};
import {Group, Sequence, Choice} from './types/Group';
export {Group, Sequence, Choice};
import {Attribute, AttributeGroup} from './types/Attribute';
export {Attribute, AttributeGroup};
import {TypeBase, SimpleType, ComplexType, SimpleContent, ComplexContent, Extension, Restriction} from './types/ComplexType';
export {TypeBase, SimpleType, ComplexType, SimpleContent, ComplexContent, Extension, Restriction};
import {Import, Include} from './types/Import';
export {Import, Include};

export class MissingReferenceError extends Error {
	constructor(tag: Base, state: State, type: string, ref: QName) {
		this.name = 'MissingReferenceError';
		this.message = 'Missing ' + type + ': ' + ref.format() + ' on line ' + tag.lineNumber + ' of ' + state.source.url;

		super(this.message);
	}
}
