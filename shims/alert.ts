import { Alert, type AlertButton } from 'react-native'
import { dw } from './bridge'

// react-native-web's Alert.alert is a no-op, so every confirm in the app
// (delete, firmware update, restart…) would silently do nothing. Show a native
// dialog instead. Cancel-style buttons go last so each OS lays them out its own
// way (macOS: action rightmost; Windows: action first).
Alert.alert = (title: string, message?: string, buttons?: AlertButton[]): void => {
  const given = buttons?.length ? buttons : [{ text: 'OK' }]
  const ordered = [...given.filter((b) => b.style !== 'cancel'), ...given.filter((b) => b.style === 'cancel')]
  void dw
    .alert({
      title,
      message,
      buttons: ordered.map((b) => b.text ?? 'OK'),
      cancelId: ordered.findIndex((b) => b.style === 'cancel'),
    })
    .then((i) => ordered[i]?.onPress?.())
}
