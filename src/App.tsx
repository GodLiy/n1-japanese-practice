import { HashRouter, Navigate, Route, Routes } from 'react-router'
import { LookupProvider } from './components/LookupProvider.tsx'
import { Shell } from './components/Shell.tsx'
import { Home } from './pages/Home.tsx'
import { ListenList } from './pages/ListenList.tsx'
import { ListenSession } from './pages/ListenSession.tsx'
import { ProgressPage } from './pages/ProgressPage.tsx'
import { ReadingList } from './pages/ReadingList.tsx'
import { ReadingSession } from './pages/ReadingSession.tsx'
import { ReadSession } from './pages/ReadSession.tsx'
import { RoleSession } from './pages/RoleSession.tsx'
import { SettingsPage } from './pages/SettingsPage.tsx'
import { ShadowSession } from './pages/ShadowSession.tsx'
import { SpeakHome } from './pages/SpeakHome.tsx'
import { WordBook } from './pages/WordBook.tsx'
import { SpeechProvider } from './speech.tsx'
import { StoreProvider } from './store.tsx'

export default function App() {
  return (
    <HashRouter>
      <StoreProvider>
        <SpeechProvider>
          <LookupProvider>
            <Routes>
              <Route element={<Shell />}>
                <Route path="/" element={<Home />} />
                <Route path="/listen" element={<ListenList />} />
                <Route path="/listen/:id" element={<ListenSession />} />
                <Route path="/reading" element={<ReadingList />} />
                <Route path="/reading/:id" element={<ReadingSession />} />
                <Route path="/speak" element={<SpeakHome />} />
                <Route path="/speak/shadow/:id" element={<ShadowSession />} />
                <Route path="/speak/role/:id" element={<RoleSession />} />
                <Route path="/speak/read/:id" element={<ReadSession />} />
                <Route path="/words" element={<WordBook />} />
                <Route path="/progress" element={<ProgressPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </LookupProvider>
        </SpeechProvider>
      </StoreProvider>
    </HashRouter>
  )
}
