import '../assets/style/art.scss';
import * as React from 'react';
import { Route, Switch, Redirect } from 'react-router-dom';
import Index from '../pages/Index';
import Points from '../pages/Points';

const mainRouter = [
  {
    name: 'index',
    key: 'index',
    route: {
      path: '/index',
      component: Index,
    },
  },
  {
    name: 'points',
    key: 'points',
    route: {
      path: '/points',
      component: Points,
    },
  },
];

const routes = (
  <Switch>
    {mainRouter.map(route => <Route key={route.key} {...route.route} />)}
    <Redirect to="./index" />
  </Switch>
);

export default routes;
