// This file is part of cxsd, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as cxml from 'cxml';

import {Namespace} from './Namespace';
import {Type} from './Type';
import {MemberRef} from './MemberRef';

export class Member extends cxml.MemberBase<Member, Namespace, cxml.ItemBase<Member>> {
	constructor(name: string) {
		super(null, name);
		this.surrogateKey = Member.nextKey++;
	}

	getRef() {
		return(new MemberRef(this, 0, 1));
	}

	getProxy() {
		var proxy = this.proxy;
		if(!proxy) {
			var proxy = new Type(null);
			proxy.namespace = this.namespace;
			proxy.isProxy = true;
			proxy.containingRef = this.getRef();

			this.proxy = proxy;
			this.namespace.addType(proxy);

			if(!this.isAbstract) {
				proxy.addChildSpec(this);
			}
		}

		return(proxy);
	}

	typeList: Type[];
	substitutes: Member;

	/** Proxy type containing other substitution group members. */
	proxy: Type;

	comment: string;

	isExported: boolean;

	surrogateKey: number;
	private static nextKey = 0;
}
