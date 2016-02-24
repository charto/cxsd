// This file is part of cxsd, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as cxml from 'cxml';

import {Member} from './Member';

export class MemberRef extends cxml.MemberRefBase<Member> {
	prefix: string;
}
