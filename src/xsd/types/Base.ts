// This file is part of cxsd, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import { Rule } from "../Rule";
import { State } from "../State";
import { Namespace } from "../Namespace";
import { Scope } from "../Scope";
import { QName } from "../QName";

export interface BaseClass {
  new (state?: State): Base;

  /** Returns other classes allowed as children. */
  mayContain(): BaseClass[];

  rule: Rule;

  // TODO I made the name property optional, because if I don't, I get the following error:
  // src/xsd/Exporter.ts|152 col 40 error| Argument of type 'typeof Primitive' is not assignable to parameter of type 'BaseClass'. Property 'name' is missing in type 'typeof Primitive'.
  // But should it be optional?
  name?: string;
}

/** Common handler base class for all schema tags. */

export class Base {
  /** Returns other classes allowed as children. */
  static mayContain = () => [] as BaseClass[];

  constructor(state?: State) {
    if (!state) return;

    this.scope = state.getScope();
    this.lineNumber = state.stateStatic.getLineNumber();
    this.bytePos = state.stateStatic.getBytePos();
  }

  /** Hook, runs after opening tag. */
  init(state: State) {}

  /** Hook, runs for text content. */
  addText(state: State, text: string) {}

  /** Hook, runs after closing tag. */
  loaded(state: State) {}

  /** Hook, runs after all dependencies have been loaded. */
  resolve(state: State) {}

  /** Add this named tag to scope, listed under given type.
	  * Optionally set number of allowed occurrences, for optional elements, sequences etc.
		* @return fully qualified name. */
  define(state: State, type: string, min = 1, max = 1, scope?: Scope) {
    var name = this.name;
    var qName: QName = null;

    if (name) {
      qName = new QName(name, state.source);
      name = qName.nameFull;
    }

    (scope || this.scope).addToParent(name, type, this, min, max);

    return qName;
  }

  getScope() {
    return this.scope;
  }

  protected scope: Scope;
  lineNumber: number;
  bytePos: number;
  name: string;

  // TODO why was this defined here?
  // TS doesn't like it, so I'm commenting it out.
  // Can we delete it?
  //static name: string;
  static rule: Rule;
}
