// This file is part of cxsd, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import { Namespace } from "./Namespace";
import { Source } from "./Source";

/** Qualified name, including reference to a namespace. */

export class QName {
  constructor(name?: string, source?: Source) {
    if (name) this.parse(name, source);
  }

  /** Parse a name with a possible namespace prefix. */

  parse(name: string, source: Source, namespace?: Namespace) {
    var splitter = name.indexOf(":");

    name = name.toLowerCase();

    if (splitter >= 0) {
      namespace = source.lookupNamespace(name.substr(0, splitter));
      name = name.substr(splitter + 1);
    } else if (!namespace) {
      namespace = source.targetNamespace;
    }

    this.namespace = namespace;
    this.name = name;
    this.nameFull = namespace ? namespace.id + ":" + name : name;

    return this;
  }

  /** Parse a class name internally used by the XSD parser. */

  parseClass(name: string, namespace: Namespace) {
    // TODO: remove following line.
    name = name.toLowerCase();

    this.namespace = namespace;
    this.name = name;
    this.nameFull = namespace.id + ":" + name;

    return this;
  }

  parsePrimitive(name: string, namespace: Namespace) {
    // TODO: remove following line.
    name = name.toLowerCase();

    this.namespace = namespace;
    this.name = name;
    this.nameFull = "*:" + name;

    return this;
  }

  /** Format name for printing (for debugging), together with namespace name. */

  format() {
    if (this.namespace) return this.namespace.name + ":" + this.name;
    else return this.name;
  }

  namespace: Namespace;
  name: string;
  nameFull: string;
}
