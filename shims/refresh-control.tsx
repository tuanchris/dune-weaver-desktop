// react-native-web's RefreshControl is a plain View that drops onRefresh: there
// is no pull gesture on desktop, so a list could never be re-read. Run it from
// the app's View → Refresh command (⌘R / Ctrl+R) instead, for the lists on the
// focused screen. Swapped in by metro.config.js.
import React, { useContext, useEffect, useRef } from 'react'
import { View, type RefreshControlProps } from 'react-native'
import { NavigationContext } from '@react-navigation/native'
import { dw } from './bridge'

const mounted = new Set<() => void>()
dw.onRefresh(() => mounted.forEach((refresh) => refresh()))

export default function RefreshControl(props: RefreshControlProps): React.JSX.Element {
  const { onRefresh, enabled, refreshing, colors, progressBackgroundColor, progressViewOffset, size, tintColor, title, titleColor, ...rest } =
    props
  const navigation = useContext(NavigationContext)
  const latest = useRef({ onRefresh, enabled, refreshing, navigation })
  latest.current = { onRefresh, enabled, refreshing, navigation }

  useEffect(() => {
    const refresh = (): void => {
      const { onRefresh, enabled, refreshing, navigation } = latest.current
      if (enabled !== false && !refreshing && (navigation?.isFocused() ?? true)) onRefresh?.()
    }
    mounted.add(refresh)
    return () => {
      mounted.delete(refresh)
    }
  }, [])

  return <View {...rest} />
}
