// This file is part of cxsd, copyright (c) 2015 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {State} from '../State';
import {Namespace} from '../Namespace';
import * as types from '../types';

/** <xsd:include> */

export class Include extends types.Base {
	static mayContain: () => types.BaseClass[] = () => [
		types.Annotation
	];

	init(state: State) {
		if(this.schemaLocation) {
			var urlRemote = state.source.urlResolve(this.schemaLocation);
			state.stateStatic.addImport(state.source.targetNamespace, urlRemote);
		}
	}

	id: string = null;
	schemaLocation: string = null;
}

/** <xsd:import> */

export class Import extends Include {
	init(state: State) {
		if(this.schemaLocation) {
			// TODO: handle importing namespaces like http://www.w3.org/XML/1998/namespace
			// without a schemaLocation.

			var urlRemote = state.source.urlResolve(this.schemaLocation);
			state.stateStatic.addImport(state.stateStatic.context.registerNamespace(this.namespace), urlRemote);
		}
	}

	namespace: string = null;
}
