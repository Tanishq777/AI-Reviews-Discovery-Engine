import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, AlertCircle, Lightbulb, Compass, Download, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import './App.css';

function App() {
  const [query, setQuery] = useState(() => localStorage.getItem("gpe_query") || "People knowing a photo exists in Google Photos but cannot search for it as the memory is vague.");
  const [source, setSource] = useState(() => localStorage.getItem("gpe_source") || "play_store");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(() => {
    const saved = localStorage.getItem("gpe_results");
    return saved ? JSON.parse(saved) : null;
  });
  const [showComments, setShowComments] = useState(false);
  const [count, setCount] = useState(() => {
    const saved = localStorage.getItem("gpe_count");
    return saved ? Number(saved) : 100;
  });

  useEffect(() => {
    localStorage.setItem("gpe_query", query);
    localStorage.setItem("gpe_source", source);
    localStorage.setItem("gpe_count", count.toString());
    if (results) {
      localStorage.setItem("gpe_results", JSON.stringify(results));
    } else {
      localStorage.removeItem("gpe_results");
    }
  }, [query, source, count, results]);

  useEffect(() => {
    if (source === 'web_forums' && count === 500) {
      setCount(200);
    }
  }, [source, count]);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      // In a purely client-side Vite app, runtime bindings aren't available to the browser, 
      // so we rely on the public rewrite. However, if this were SSR or an API route,
      // we would use the injected VITE_BACKEND_URL binding.
      const API_URL = import.meta.env.VITE_BACKEND_URL 
        ? new URL("/api/analyze", import.meta.env.VITE_BACKEND_URL).href 
        : "/api/analyze";

      const response = await axios.post(API_URL, {
        query,
        source,
        count
      });
      setResults(response.data);
    } catch (error) {
      console.error("Error fetching analysis:", error);
      const msg = error.response?.data?.detail || "Failed to fetch analysis. Please check your connection or try again.";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };
  const exportToTxt = () => {
    if (!results) return;

    const sourceMap = {
      play_store: "Google Play Reviews",
      app_store: "App Store Reviews",
      reddit: "Reddit Discussions",
      web_forums: "Web & YouTube"
    };

    let content = `Google Photos Discovery Engine Report\n`;
    content += `Query: ${query}\n`;
    content += `Source: ${sourceMap[source]}\n`;
    content += `Data Type: ${results.is_live ? "Live Data" : "Mock Data"}\n`;
    content += `===================================================\n\n`;

    content += `1. COMMON RETRIEVAL PROBLEMS\n`;
    content += `---------------------------------------------------\n`;
    results.problems?.forEach((p, i) => {
      content += `${i + 1}. ${p.title}\n`;
      content += `   Description: ${p.description}\n`;
      if (p.evidence_quote) content += `   Evidence: "${p.evidence_quote}"\n`;
      content += `\n`;
    });

    content += `2. USER SEARCH STRATEGIES\n`;
    content += `---------------------------------------------------\n`;
    results.strategies?.forEach((s, i) => {
      content += `${i + 1}. ${s.title}\n`;
      content += `   Description: ${s.description}\n`;
      if (s.evidence_quote) content += `   Evidence: "${s.evidence_quote}"\n`;
      content += `\n`;
    });

    content += `3. OPPORTUNITY AREAS\n`;
    content += `---------------------------------------------------\n`;
    results.opportunities?.forEach((o, i) => {
      content += `${i + 1}. ${o.title}\n`;
      content += `   Description: ${o.description}\n`;
      content += `\n`;
    });

    content += `4. FILTERED COMMENTS (Used for AI Analysis)\n`;
    content += `---------------------------------------------------\n`;
    results.filtered_reviews?.forEach((review, i) => {
      content += `${i + 1}. ${review.replace(/\n/g, ' ')}\n\n`;
    });

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `discovery_engine_report_${source}_${count}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadRawComments = () => {
    if (!results || !results.raw_reviews) return;
    let content = `Raw Extracted Comments (${results.raw_reviews.length} items)\n`;
    content += `Query: ${query}\n`;
    content += `Source: ${source}\n`;
    content += `Target Count: ${count}\n`;
    content += `===================================================\n\n`;
    results.raw_reviews.forEach((r, i) => {
      content += `--- Comment ${i+1} ---\n${r}\n\n`;
    });
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `raw_comments_dump_${source}_${count}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="dashboard-container">
      <header className="header">
        <h1>Discovery Engine</h1>
        <p>Analyze user retrieval problems & opportunities across platforms</p>
      </header>

      <main>
        <div className="glass-panel">
          <div className="search-section" style={{ alignItems: 'flex-start' }}>
            <div style={{ flex: '1 1 70%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600', paddingLeft: '0.2rem' }}>Question</label>
              <textarea
                className="search-input"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
                placeholder="What retrieval problem are we investigating?"
                style={{ width: '100%', resize: 'none', overflow: 'hidden', minHeight: '80px', boxSizing: 'border-box' }}
                rows={3}
                maxLength={300}
              />
              <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '-0.25rem', paddingRight: '0.5rem' }}>
                {query.length}/300
              </div>
            </div>
            <div style={{ flex: '0 1 10%', minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600', paddingLeft: '0.2rem' }}>Platform</label>
              <select 
                className="search-input custom-select" 
                style={{ width: '100%', paddingRight: '2.5rem' }}
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                <option value="play_store">Google Play Reviews</option>
                <option value="app_store">App Store Reviews</option>
                <option value="web_forums">Web & YouTube</option>
              </select>
            </div>
            <div style={{ flex: '0 1 10%', minWidth: '120px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600', paddingLeft: '0.2rem' }}>Comments</label>
              <select 
                className="search-input custom-select" 
                style={{ width: '100%', paddingRight: '2.5rem' }}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500} disabled={source === 'web_forums'}>500</option>
              </select>
            </div>
            <div style={{ flex: '0 0 10%', minWidth: '120px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', visibility: 'hidden', paddingLeft: '0.2rem' }}>Action</label>
              <button 
                className="search-button" 
                style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', padding: '0 1rem', height: '52px' }}
                onClick={handleAnalyze}
                disabled={loading}
              >
                {loading ? <div className="loader"></div> : <><Search size={20} /> Analyze</>}
              </button>
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'right', marginTop: '0.5rem', marginBottom: '1rem', marginRight: '0.5rem' }}>
            Powered by OpenAI model
          </div>

          {results && (
            <div style={{ animation: 'fadeInDown 0.8s ease-out' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem 1rem', borderRadius: '20px', width: 'fit-content' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: results.is_live ? '#10b981' : '#f59e0b', boxShadow: `0 0 8px ${results.is_live ? '#10b981' : '#f59e0b'}`, animation: 'pulse 2s infinite' }}></div>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '600' }}>
                    {results.is_live ? "Live Results (Real Scraped Data)" : "Mock Results (Fallback Data)"}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={downloadRawComments} className="search-button" style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.5rem', background: 'var(--surface-light)', color: 'var(--text-primary)' }}>
                    <Download size={18} /> Raw Dump ({results.raw_reviews?.length || 0})
                  </button>
                  <button onClick={exportToTxt} className="search-button" style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.5rem', background: 'var(--surface-light)', color: 'var(--text-primary)' }}>
                    <Download size={18} /> Export Report
                  </button>
                </div>
              </div>

              <div className="section-title">
                <AlertCircle size={24} />
                Common Retrieval Problems
              </div>
              <div className="results-grid">
                {results.problems?.map((prob, idx) => (
                  <div key={idx} className="item-card">
                    <h3>{prob.title}</h3>
                    <p>{prob.description}</p>
                    {prob.evidence_quote && <div className="quote">"{prob.evidence_quote}"</div>}
                  </div>
                ))}
              </div>

              <div className="section-title" style={{ marginTop: '3rem' }}>
                <Compass size={24} />
                User Search Strategies
              </div>
              <div className="results-grid">
                {results.strategies?.map((strat, idx) => (
                  <div key={idx} className="item-card">
                    <h3>{strat.title}</h3>
                    <p>{strat.description}</p>
                    {strat.evidence_quote && <div className="quote">"{strat.evidence_quote}"</div>}
                  </div>
                ))}
              </div>

              <div className="section-title" style={{ marginTop: '3rem' }}>
                <Lightbulb size={24} />
                Opportunity Areas
              </div>
              <div className="results-grid">
                {results.opportunities?.map((opp, idx) => (
                  <div key={idx} className="item-card" style={{ borderLeftColor: 'var(--success)' }}>
                    <h3 style={{ color: 'var(--success)' }}>{opp.title}</h3>
                    <p>{opp.description}</p>
                  </div>
                ))}
              </div>

              <div className="section-title" style={{ marginTop: '3rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', borderRadius: '10px', transition: 'background 0.2s' }} onClick={() => setShowComments(!showComments)} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={24} />
                  Filtered Source Comments ({results.filtered_reviews?.length || 0})
                </div>
                {showComments ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
              </div>
              
              {showComments && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem', animation: 'fadeInDown 0.3s ease-out' }}>
                  {results.filtered_reviews?.map((review, idx) => (
                    <div key={idx} className="item-card" style={{ padding: '1rem', fontSize: '0.9rem', lineHeight: '1.5' }}>
                      {review}
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
