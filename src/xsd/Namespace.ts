// This file is part of cxsd, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import { NamespaceBase } from "@wikipathways/cxml";

import { Context } from "./Context";
import { Loader } from "./Loader";
import { Source } from "./Source";
import { Scope } from "./Scope";

/** XML namespace, binding it to syntax definitions. */

export class Namespace extends NamespaceBase<Context> {
  constructor(name: string, id: number, context: Context) {
    super(name, id, context);

    this.scope = new Scope(context.getPrimitiveScope(), this);
  }

  /** Initialize names and addresses. Can be called multiple times. */
  init(url?: string, short?: string) {
    if (url) {
      if (!this.schemaUrl) this.schemaUrl = url;
    }

    if (short) {
      if (!this.short) this.short = short;
    }

    return this;
  }

  addSource(source: Source) {
    if (!this.sourceTbl[source.id]) {
      this.sourceTbl[source.id] = source;
      this.sourceList.push(source);
    }
  }

  /** Update final address of schema file if HTTP request was redirected. */
  updateUrl(urlOld: string, urlNew: string) {
    if (!this.schemaUrl || this.schemaUrl == urlOld) this.schemaUrl = urlNew;
  }

  /** Fetch the root scope with published attributes, groups, elements... */
  getScope() {
    return this.scope;
  }

  /** @return List of all source files potentially contributing to this namespace. */
  getSourceList() {
    return this.sourceList;
  }

  /** List of all source files potentially contributing to this namespace. */
  private sourceList: Source[] = [];

  /** Source files potentially contributing to this namespace. */
  private sourceTbl: { [id: number]: Source } = {};

  /** Global scope where exported members will be published. */
  private scope: Scope;
}
