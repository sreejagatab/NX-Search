import { Link } from 'react-router-dom'
import { SearchBar } from '../components/SearchBar'
import { ResultList } from '../components/ResultList'
import { AskBrain } from '../components/AskBrain'
import { StatsChip } from '../components/StatsChip'
import { SidebarFilters } from '../components/SidebarFilters'
import { FilterChips } from '../components/FilterChips'
import { LensesBar } from '../components/LensesBar'
import { ProgressBar } from '../components/ProgressBar'
import { OfflineBanner } from '../components/OfflineBanner'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { DetailPane } from '../components/DetailPane'
import { CommandPalette } from '../components/CommandPalette'
import { AnalyticsPanel } from '../components/AnalyticsPanel'
import { AISummary } from '../components/AISummary'
import { AIModeCard } from '../components/AIModeCard'
import { CollectionsPanel } from '../components/CollectionsPanel'
import { useResultsPage } from '../hooks/useResultsPage'

export function Results() {
  const p = useResultsPage()
  const { search } = p

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <CommandPalette
        open={p.paletteOpen}
        onClose={() => p.setPaletteOpen(false)}
        mode={search.mode}
        focusMode={search.focusMode}
        onSetMode={search.setMode}
        onSetSort={search.setSort}
        onSetFocusMode={search.setFocusMode}
        onToggleAiMode={p.toggleAiMode}
        onToggleCollections={p.openCollections}
        onExport={search.allResults.length > 0 ? p.exportJson : undefined}
        onToggleTheme={p.cycleTheme}
        onNavigate={q => { search.setQuery(q); p.setPaletteOpen(false) }}
      />
      <AnalyticsPanel open={p.analyticsOpen} onClose={() => p.setAnalyticsOpen(false)} />
      <CollectionsPanel
        open={p.collectionsOpen}
        onClose={() => p.setCollectionsOpen(false)}
        onNavigate={q => { search.setQuery(q); p.setCollectionsOpen(false) }}
        currentQuery={p.aiAnswer.answer ? search.query : undefined}
        currentAnswer={p.aiAnswer.answer || undefined}
        currentResults={search.allResults}
      />
      <OfflineBanner />
      <ProgressBar loading={search.loading} />

      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-bg/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/" className="text-amber-400 font-bold text-lg tracking-tight shrink-0">NX</Link>
          <div className="flex-1 min-w-0">
            <SearchBar
              query={search.query}
              mode={search.mode}
              domains={search.domains}
              focusMode={search.focusMode}
              onQueryChange={search.setQuery}
              onFocusModeChange={search.setFocusMode}
              size="sm"
            />
          </div>
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            <StatsChip
              totalPatterns={p.stats.total_patterns}
              totalVectors={p.stats.total_vectors}
              queryTimeMs={search.queryTimeMs}
            />
          </div>

          <div className="hidden sm:flex items-center shrink-0 border border-border rounded-lg overflow-hidden divide-x divide-border">
            <button onClick={p.cycleTheme} title={`Theme: ${p.theme}`}
              className="px-2.5 py-2 text-gray-500 hover:text-gray-200 hover:bg-subtle transition-colors text-sm">
              {p.themeIcon}
            </button>
            <button onClick={p.openAnalytics} title="Search analytics"
              className={`px-2.5 py-2 transition-colors text-sm ${p.analyticsOpen ? 'text-amber-400 bg-amber-400/10' : 'text-gray-500 hover:text-gray-200 hover:bg-subtle'}`}>
              📊
            </button>
            <button onClick={p.openCollections} title="Saved answers (Alt+C)"
              className={`px-2.5 py-2 transition-colors text-sm ${p.collectionsOpen ? 'text-amber-400 bg-amber-400/10' : 'text-gray-500 hover:text-gray-200 hover:bg-subtle'}`}>
              🗂
            </button>
            {search.allResults.length > 0 && (
              <button onClick={p.exportJson} title="Export results as JSON"
                className="px-2.5 py-2 text-gray-500 hover:text-gray-200 hover:bg-subtle transition-colors text-sm">
                ⬇
              </button>
            )}
            <button onClick={() => p.setPaletteOpen(true)} title="Command palette (⌘K)"
              className="px-2.5 py-2 text-gray-500 hover:text-amber-400 hover:bg-subtle transition-colors text-[11px] font-medium tracking-tight">
              ⌘K
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={p.toggleAiMode}
              title="Toggle AI Mode (Alt+A)"
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-medium ${
                p.aiMode
                  ? 'text-amber-300 border-amber-400/50 bg-gradient-to-r from-amber-400/15 to-violet-500/15 shadow-sm shadow-amber-400/10'
                  : 'text-gray-400 border-border hover:border-amber-400/30 hover:text-gray-200'
              }`}
            >
              ✦ AI
            </button>
            <button
              onClick={() => p.setAskVisible(v => !v)}
              title="Ask Brain panel"
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                p.askVisible
                  ? 'bg-amber-400/10 text-amber-400 border-amber-400/30'
                  : 'text-gray-400 border-border hover:border-amber-400/30 hover:text-gray-200'
              }`}
            >
              Ask
            </button>
          </div>
        </div>

        <FilterChips
          domains={search.domains}
          mode={search.mode}
          sort={search.sort}
          minConfidence={search.minConfidence}
          activeSources={search.activeSources}
          onRemoveDomain={d => search.setDomains(search.domains.filter(x => x !== d))}
          onSetMode={search.setMode}
          onSetSort={search.setSort}
          onResetConfidence={() => search.setMinConfidence(0)}
          onRemoveSource={s => search.setActiveSources(search.activeSources.filter(x => x !== s))}
          onClearAll={p.clearAllFilters}
        />
        <LensesBar
          domains={search.domains}
          mode={search.mode}
          sort={search.sort}
          minConfidence={search.minConfidence}
          onApply={p.applyLens}
        />
      </header>

      <div className="max-w-7xl mx-auto w-full flex gap-0 px-4 py-6">

        {/* Left sidebar */}
        <aside className={`hidden lg:flex flex-col shrink-0 transition-all duration-200 ${p.sidebarOpen ? 'w-52 mr-6' : 'w-8 mr-3'}`}>
          <div className="sticky top-24 flex flex-col gap-2">
            <button
              onClick={() => p.setSidebarOpen(v => !v)}
              title={p.sidebarOpen ? 'Collapse filters' : 'Expand filters'}
              className="self-start flex items-center gap-1.5 text-[10px] text-gray-600 hover:text-gray-300 transition-colors mb-1 uppercase tracking-wider"
            >
              {p.sidebarOpen ? <><span>◀</span><span>Filters</span></> : <span title="Filters">▶</span>}
            </button>
            {p.sidebarOpen && (
              <SidebarFilters
                domains={p.domains}
                activeDomains={search.domains}
                domainCounts={search.domainCounts}
                onDomainsChange={search.setDomains}
                excludedDomains={search.excludedDomains}
                onExcludedDomainsChange={search.setExcludedDomains}
                minConfidence={search.minConfidence}
                onMinConfidenceChange={search.setMinConfidence}
                sources={search.allSources}
                activeSources={search.activeSources}
                sourceCounts={search.sourceCounts}
                onSourcesChange={search.setActiveSources}
                excludedSources={search.excludedSources}
                onExcludedSourcesChange={search.setExcludedSources}
              />
            )}
          </div>
        </aside>

        {/* Main results */}
        <main className="flex-1 min-w-0 pb-36 lg:pb-0">
          {search.focusMode === 'quick' ? (
            search.query && !search.loading && (
              <div className="flex items-center gap-2 text-xs text-gray-600 mb-4 px-1">
                <span className="text-amber-400/50">⚡</span>
                Quick mode — AI disabled for fastest results
              </div>
            )
          ) : p.aiMode ? (
            <ErrorBoundary label="AI answer">
              <AIModeCard
                query={search.query}
                summary={search.aiSummary}
                intent={search.intent}
                intentConfidence={search.intentConfidence}
                enginesUsed={search.enginesUsed}
                sources={search.resultSources}
                queryTimeMs={search.queryTimeMs}
                relatedSearches={search.relatedSearches}
                results={search.allResults}
                onRelatedClick={q => { search.setQuery(q); search.setPage(1) }}
                onFollowUp={q => { search.setQuery(q); search.setPage(1) }}
                answer={p.aiAnswer.answer}
                answerLoading={p.aiAnswer.loading}
                answerError={p.aiAnswer.error}
                onAbortAnswer={p.aiAnswer.abort}
                answerStyle={p.answerStyle}
                onAnswerStyleChange={p.handleAnswerStyleChange}
              />
            </ErrorBoundary>
          ) : (
            <ErrorBoundary label="AI summary">
              <AISummary
                summary={search.aiSummary}
                intent={search.intent}
                enginesUsed={search.enginesUsed}
                sources={search.resultSources}
                queryTimeMs={search.queryTimeMs}
                relatedSearches={search.relatedSearches}
                results={search.allResults}
                onRelatedClick={q => { search.setQuery(q); search.setPage(1) }}
              />
            </ErrorBoundary>
          )}
          <ErrorBoundary label="Results">
            <ResultList
              results={search.results}
              query={search.query}
              loading={search.loading}
              isStale={search.isStale}
              error={search.error}
              total={search.total}
              filteredCount={search.filteredCount}
              page={search.page}
              totalPages={search.totalPages}
              sort={search.sort}
              pageSize={search.pageSize}
              localFilter={search.localFilter}
              onLocalFilterChange={search.setLocalFilter}
              onPageChange={search.setPage}
              onSortChange={search.setSort}
              onPageSizeChange={search.setPageSize}
              onRetry={search.retrySearch}
              highlightId={p.highlightId}
              onMoreLike={p.handleMoreLike}
              onCardClick={p.setDetailResult}
              onExplain={p.handleExplain}
              compact={p.aiMode}
              detailOpen={p.detailResult !== null}
            />
          </ErrorBoundary>
        </main>

        {/* Right panel — Detail pane or Ask Brain */}
        <div className={`hidden lg:block shrink-0 transition-all duration-200 ${(p.detailResult || p.askVisible) ? 'w-80 ml-4' : 'w-0'}`}>
          {p.detailResult ? (
            <DetailPane
              result={p.detailResult}
              query={search.query}
              onClose={() => p.setDetailResult(null)}
            />
          ) : (
            <AskBrain
              query={search.query}
              results={search.allResults}
              visible={p.askVisible}
              onClose={() => p.setAskVisible(false)}
              onFollowUp={p.handleFollowUp}
              explainResult={p.explainResult}
              onExplainDone={() => p.setExplainResult(null)}
              thread={p.aiAnswer.thread}
              onClearThread={p.aiAnswer.clearThread}
              onExchange={p.aiAnswer.appendExchange}
            />
          )}
        </div>

        {/* Mobile: Ask Brain as bottom sheet */}
        {p.askVisible && !p.detailResult && (
          <div className="lg:hidden fixed inset-x-0 bottom-0 z-30 bg-bg border-t border-border rounded-t-2xl shadow-2xl max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-center pt-2 pb-1 shrink-0">
              <div className="w-10 h-1 bg-border rounded-full" />
            </div>
            <div className="flex-1 overflow-y-auto">
              <AskBrain
                query={search.query}
                results={search.allResults}
                visible={p.askVisible}
                onClose={() => p.setAskVisible(false)}
                onFollowUp={p.handleFollowUp}
                explainResult={p.explainResult}
                onExplainDone={() => p.setExplainResult(null)}
                thread={p.aiAnswer.thread}
                onClearThread={p.aiAnswer.clearThread}
                onExchange={p.aiAnswer.appendExchange}
              />
            </div>
          </div>
        )}

        {/* Mobile filter drawer */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-bg border-t border-border">
          <button
            onClick={() => p.setFiltersOpen(v => !v)}
            className="w-full text-xs text-gray-500 flex items-center justify-center gap-2 py-2.5"
          >
            <span>⊞</span> Filters {p.filtersOpen ? '▲' : '▼'}
          </button>
          {p.filtersOpen && (
            <div className="pb-4 px-4 max-h-60 overflow-y-auto border-t border-border">
              <SidebarFilters
                domains={p.domains}
                activeDomains={search.domains}
                domainCounts={search.domainCounts}
                onDomainsChange={d => { search.setDomains(d); p.setFiltersOpen(false) }}
                excludedDomains={search.excludedDomains}
                onExcludedDomainsChange={search.setExcludedDomains}
                minConfidence={search.minConfidence}
                onMinConfidenceChange={search.setMinConfidence}
                sources={search.allSources}
                activeSources={search.activeSources}
                sourceCounts={search.sourceCounts}
                onSourcesChange={search.setActiveSources}
                excludedSources={search.excludedSources}
                onExcludedSourcesChange={search.setExcludedSources}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
