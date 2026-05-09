import React from 'react';
import { ViewProps } from 'react-native';

export class PagerView extends React.Component<ViewProps & { initialPage?: number; onPageSelected?: any; useNext?: boolean }> {
  setPage(selectedPage: number): void;
}
