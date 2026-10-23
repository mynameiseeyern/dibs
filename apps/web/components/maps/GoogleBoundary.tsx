"use client";

import { Component, type ReactNode } from "react";

/**
 * Google's place elements throw from inside React when they reject a value. Catch that here so
 * one card falls back to the plain version instead of taking the whole page down.
 */
export class GoogleBoundary extends Component<{ fallback: ReactNode; children: ReactNode; onError?: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error("[place card]", error);
    this.props.onError?.();
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
