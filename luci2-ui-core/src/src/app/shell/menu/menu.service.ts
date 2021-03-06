/*!
 * Copyright (c) 2017 Adrian Panella <ianchi74@outlook.com>, contributors.
 * Licensed under the MIT license.
 */

import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { UbusService } from '../../ubus/ubus.service';
import { IMenu, IMenuItem } from './menu.interface';
import { Routes, Route, Router } from '@angular/router';
import { RoutedWidgetComponent } from 'reactive-json-form-ng';
import { ViewsResolverService } from '../../shared/viewsresolver.service';

const FIXED_MENU = {
  'development': { title: 'Development', index: 999 },
  'development/ubus':
    { title: 'Ubus tester', view: 'development/ubus', index: 0 },
  'development/uci':
    { title: 'UCI editor', view: 'development/uci', index: 1 },
  'development/widget':
    { title: 'Widget', view: 'development/widget', index: 2 }
};


@Injectable()
export class MenuService {

  private _routes: Routes = [
  ];
  private _menu: IMenuItem;

  constructor(private _ubus: UbusService, private _router: Router) { }

  loadMenu(): Observable<IMenuItem> {
    if (this._menu) return of(this._menu);

    return this._ubus.call<any>('luci2.ui', 'menu').pipe(
      map(r => this._toChildArray(this._toChildTree(Object.assign(r.menu, FIXED_MENU)))),
      map(root => {
        this._router.resetConfig(this._routes);

        this._menu = root;
        return root;
      }));
  }


  /**
   * Returns a new transforms menu definition from the flat path like object returned by ubus luci.ui to a tree like structure
   * with subnodes in a 'childs' property, for further transformation to ordered array children
   *
   * @param menu
   */
  private _toChildTree(menu: IMenu): IMenuItem {
    const root: IMenuItem = { title: 'root', index: 0, link: '/', childs: {} };
    let node: IMenuItem;


    if (!menu) return root;

    for (const key in menu)
      if (menu.hasOwnProperty(key)) {

        const path = key.split(/\//);
        node = root;

        for (let i = 0; i < path.length; i++) {
          if (!node.childs)
            node.childs = {};

          if (!node.childs[path[i]])
            node.childs[path[i]] = { link: '/' + path.slice(0, i + 1).join('/') };

          node = node.childs[path[i]];
        }

        Object.assign(node, menu[key]);
        if (!node.title) node.title = node.path;
      }

    return root;
  }

  /**
   * Transforms the node definition from child as objects to childs as array, mutating the original menu definition
   * Children are sorted according the 'index' property
   * @param node
   */
  private _toChildArray(node: IMenuItem): IMenuItem {
    const childs: IMenuItem[] = [];

    if (!node.childs) {
      this._addRoute(node);
      return node;
    }

    for (const key in node.childs)
      if (node.childs.hasOwnProperty(key)) {
        this._toChildArray(node.childs[key]);
        childs.push(node.childs[key]);
      }

    childs.sort((a, b) => (a.index || 0) - (b.index || 0));

    if (childs.length) {
      node.childs = childs;
    } else {
      delete node.childs;
    }

    this._addRoute(node);

    return node;

  }

  private _addRoute(item: IMenuItem) {

    const route: Route = { path: item.link.substr(1) || '' };

    if (item.childs) {
      route.redirectTo = item.childs[0].link;
      route.pathMatch = 'full';
    } else {
      route.component = RoutedWidgetComponent;
      route.resolve = { widgetDef: ViewsResolverService };
      route.data = { view: item.view };
    }

    this._routes.push(route);
  }

}
