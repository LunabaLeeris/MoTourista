import React, { forwardRef } from 'react';
import { View } from 'react-native';
import MapLibreWebView from './MapLibreWebView';
import { MoTouristaMapRef, MoTouristaMapProps } from '../../types/map';

/**
 * MoTouristaMap facade component.
 * Serves as the single decoupled interface between screens and the map rendering engine.
 * Styled with Tailwind CSS utility classes.
 */
const MoTouristaMap = forwardRef<MoTouristaMapRef, MoTouristaMapProps>((props, ref) => {
  return (
    <View className="flex-1 bg-[#0c1017]">
      <MapLibreWebView ref={ref} {...props} />
    </View>
  );
});

export default MoTouristaMap;
