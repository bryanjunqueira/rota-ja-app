/**
 * PagerView wrapper — Web fallback (View simples pra não quebrar)
 */
import React from 'react';
import { View, ViewProps } from 'react-native';

export const PagerView = React.forwardRef<View, ViewProps & { initialPage?: number; onPageSelected?: any; useNext?: boolean }>(
  ({ children, style, ...props }, ref) => {
    return (
      <View ref={ref} style={style}>
        {React.Children.toArray(children)[0]}
      </View>
    );
  }
);

PagerView.displayName = 'PagerViewWeb';
export default PagerView;
