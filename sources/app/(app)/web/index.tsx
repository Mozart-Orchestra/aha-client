/**
 * Web Dashboard Entry Point
 * Route: /web
 * Redirects to team stats dashboard
 */

import React from 'react';
import { Redirect } from 'expo-router';

export default function WebIndex() {
  // Redirect to team stats dashboard as default web view
  return <Redirect href="/web/teams/stats" />;
}
