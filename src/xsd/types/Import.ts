// This file is part of fast-xml, copyright (c) 2015 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {State} from '../State';
import {Namespace} from '../Namespace';
import * as types from '../types';

/** <xsd:import> */

export class Import extends types.Base {
	init(state: State) {
		if(this.schemaLocation) {
			// TODO: handle importing namespaces like http://www.w3.org/XML/1998/namespace
			// without a schemaLocation.

			var urlRemote = state.source.urlResolve(this.schemaLocation);
			state.stateStatic.addImport(Namespace.register(this.namespace, urlRemote), urlRemote);
		}
	}

	id: string = null;
	namespace: string = null;
	schemaLocation: string = null;
}

// <xsd:include>

export class Include extends types.Base {
	init(state: State) {
		if(this.schemaLocation) {
			var urlRemote = state.source.urlResolve(this.schemaLocation);
			state.stateStatic.addImport(state.source.targetNamespace, urlRemote);
		}
	}

	id: string = null;
	schemaLocation: string = null;
}
