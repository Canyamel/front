import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'

import { createStore, persistAuthTokens } from '@medml/store'

import { getRouterBasename } from '@medml/shared'
import { ErrorBoundary } from '@medml/layout'

import App from './App'

import './styles/reset.scss'
import './styles/global.scss'

const store = createStore()
persistAuthTokens(store)

const rootEl = document.getElementById('root')
if (!rootEl) {
	throw new Error('Root element #root not found')
}

createRoot(rootEl).render(
	<Provider store={store}>
		<BrowserRouter basename={getRouterBasename()}>
			<ErrorBoundary>
				<App />
			</ErrorBoundary>
		</BrowserRouter>
	</Provider>,
)
