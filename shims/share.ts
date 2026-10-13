import { Share, type ShareAction, type ShareContent } from 'react-native'
import { dw } from './bridge'

// Electron has no Web Share API (navigator.share is undefined), so
// react-native-web's Share.share always rejects. The app only shares text (the
// diagnostics report), so save it through a native save dialog instead.
Share.share = async (content: ShareContent): Promise<ShareAction> => {
  const saved = await dw.save({ name: `${content.title || 'Dune Weaver'}.txt`, text: content.message ?? content.url ?? '' })
  return { action: saved ? Share.sharedAction : Share.dismissedAction }
}
