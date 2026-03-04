import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react-native';
import { WebShell } from '../WebShell';

describe('WebShell', () => {
  it('should render with children', () => {
    const { getByText } = render(
      <WebShell title="Test Page">
        <div>Test Content</div>
      </WebShell>
    );

    expect(getByText('Test Content')).toBeTruthy();
  });

  it('should render sidebar when showSidebar is true', () => {
    const { getByText } = render(
      <WebShell title="Test" showSidebar={true}>
        <div>Content</div>
      </WebShell>
    );

    // Sidebar should contain "MY TEAMS" label
    expect(getByText('MY TEAMS')).toBeTruthy();
  });

  it('should render title in top nav', () => {
    const { getByText } = render(
      <WebShell title="Team Chat">
        <div>Content</div>
      </WebShell>
    );

    expect(getByText('Team Chat')).toBeTruthy();
  });

  it('should render right panel when showRightPanel is true', () => {
    const { getByText } = render(
      <WebShell
        title="Test"
        showRightPanel={true}
        rightPanelContent={<div>Right Panel</div>}
      >
        <div>Content</div>
      </WebShell>
    );

    expect(getByText('Right Panel')).toBeTruthy();
  });
});
